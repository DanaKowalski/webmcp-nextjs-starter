import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCallLog, withLogging } from '@/lib/callLog';
import { createTryTool } from '@/lib/tryTool';

const ok: WebMCP.Tool = {
  name: 'ok',
  description: 'Works.',
  execute: () => ({ content: [{ type: 'text', text: 'fine' }] }),
};
const broken: WebMCP.Tool = {
  name: 'broken',
  description: 'Throws.',
  execute: () => {
    throw new Error('tool broke');
  },
};

function setup() {
  const log = createCallLog('try-tool-test');
  const tools = withLogging([ok, broken], log);
  return { log, tools, tryTool: createTryTool(tools, log) };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('tryTool without WebMCP', () => {
  it('runs the tool directly and logs it as Try it', async () => {
    const { log, tryTool } = setup();
    await tryTool('ok', {});
    expect(log.getSnapshot().entries).toMatchObject([
      { tool: 'ok', source: 'Try it', status: 'done', output: 'fine' },
    ]);
  });

  it('logs a tool that throws exactly once, and does not throw itself', async () => {
    const { log, tryTool } = setup();
    await expect(tryTool('broken', {})).resolves.toBeUndefined();
    expect(log.getSnapshot().entries).toMatchObject([
      { tool: 'broken', status: 'error', output: 'tool broke' },
    ]);
  });

  it('logs an unknown tool name instead of doing nothing', async () => {
    const { log, tryTool } = setup();
    await tryTool('missing', {});
    expect(log.getSnapshot().entries).toMatchObject([
      { tool: 'missing', source: 'Try it', status: 'error', output: 'No tool called missing.' },
    ]);
  });
});

describe('tryTool with WebMCP', () => {
  /* A fake browser: executeTool runs the registered (logged) tool, the way
     Chrome does, and returns its result as a string. */
  function browserWith(tools: WebMCP.Tool[], overrides: Partial<WebMCP.ModelContext> = {}) {
    const mc = {
      registerTool: vi.fn(),
      getTools: vi.fn(async () => tools.map(({ name, description }) => ({ name, description }))),
      executeTool: vi.fn(async (registered: WebMCP.RegisteredTool, input: object) => {
        const tool = tools.find((t) => t.name === registered.name)!;
        return JSON.stringify(await tool.execute(input as WebMCP.ToolInput));
      }),
      ...overrides,
    };
    vi.stubGlobal('document', { modelContext: mc });
    vi.stubGlobal('navigator', {});
    return mc;
  }

  it('goes through the browser when the tool is registered', async () => {
    const { log, tools, tryTool } = setup();
    const mc = browserWith(tools);
    await tryTool('ok', { a: 1 });
    expect(mc.executeTool).toHaveBeenCalledWith(expect.objectContaining({ name: 'ok' }), { a: 1 });
    expect(log.getSnapshot().entries).toMatchObject([{ tool: 'ok', source: 'Try it', status: 'done' }]);
  });

  it('logs a failure the browser raises before the tool runs', async () => {
    const { log, tools, tryTool } = setup();
    browserWith(tools, {
      executeTool: vi.fn().mockRejectedValue(new Error('refused')),
    });
    await tryTool('ok', {});
    expect(log.getSnapshot().entries).toMatchObject([
      { tool: 'ok', status: 'error', output: 'refused' },
    ]);
  });

  it('logs a failure inside the tool once, not twice', async () => {
    const { log, tools, tryTool } = setup();
    browserWith(tools);
    await tryTool('broken', {});
    expect(log.getSnapshot().entries).toHaveLength(1);
  });

  it('falls back to running the tool directly when it is not registered', async () => {
    const { log, tryTool } = setup();
    const mc = browserWith([]);
    await tryTool('ok', {});
    expect(mc.executeTool).not.toHaveBeenCalled();
    expect(log.getSnapshot().entries).toMatchObject([{ tool: 'ok', status: 'done' }]);
  });
});
