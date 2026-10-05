import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  executeTool,
  findRegisteredTool,
  getModelContext,
  parseToolInput,
} from '@/lib/modelContext';

const TOOL: WebMCP.RegisteredTool = { name: 'get_quote', description: 'Price a job.' };

const fakeContext = (overrides: Partial<WebMCP.ModelContext> = {}) =>
  ({
    registerTool: vi.fn(),
    getTools: vi.fn(async () => [TOOL]),
    executeTool: vi.fn(async () => 'ok'),
    ...overrides,
  }) as unknown as WebMCP.ModelContext;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getModelContext', () => {
  it('returns undefined outside a browser', () => {
    expect(getModelContext()).toBeUndefined();
  });

  it('prefers document.modelContext', () => {
    const current = fakeContext();
    vi.stubGlobal('document', { modelContext: current });
    vi.stubGlobal('navigator', { modelContext: fakeContext() });
    expect(getModelContext()).toBe(current);
  });

  it('falls back to navigator.modelContext on older builds', () => {
    const older = fakeContext();
    vi.stubGlobal('document', {});
    vi.stubGlobal('navigator', { modelContext: older });
    expect(getModelContext()).toBe(older);
  });
});

describe('findRegisteredTool', () => {
  it('finds a registered tool by name', async () => {
    expect(await findRegisteredTool(fakeContext(), 'get_quote')).toBe(TOOL);
  });

  it('returns undefined when the name is not registered', async () => {
    expect(await findRegisteredTool(fakeContext(), 'nope')).toBeUndefined();
  });

  it('returns undefined when the browser cannot call tools', async () => {
    expect(await findRegisteredTool(undefined, 'get_quote')).toBeUndefined();
    expect(
      await findRegisteredTool(fakeContext({ executeTool: undefined }), 'get_quote'),
    ).toBeUndefined();
  });
});

describe('executeTool', () => {
  const input = { service: 'tune-up' };

  it('passes the arguments as an object', async () => {
    const mc = fakeContext();
    await executeTool(mc, TOOL, input);
    expect(mc.executeTool).toHaveBeenCalledTimes(1);
    expect(mc.executeTool).toHaveBeenCalledWith(TOOL, input);
  });

  it('retries as a JSON string when the build cannot parse an object', async () => {
    const run = vi
      .fn()
      .mockRejectedValueOnce(new Error('Failed to parse input arguments'))
      .mockResolvedValueOnce('ok');
    const mc = fakeContext({ executeTool: run });
    expect(await executeTool(mc, TOOL, input)).toBe('ok');
    expect(run).toHaveBeenLastCalledWith(TOOL, JSON.stringify(input));
  });

  it('does not retry when the tool itself failed', async () => {
    const run = vi.fn().mockRejectedValue(new Error('tool broke'));
    const mc = fakeContext({ executeTool: run });
    await expect(executeTool(mc, TOOL, input)).rejects.toThrow('tool broke');
    expect(run).toHaveBeenCalledTimes(1);
  });
});

describe('parseToolInput', () => {
  it.each([
    [{ a: 1 }, { a: 1 }],
    ['{"a":1}', { a: 1 }],
    ['', {}],
    [undefined, {}],
    [null, {}],
  ])('%j becomes %j', (raw, expected) => {
    expect(parseToolInput(raw)).toEqual(expected);
  });

  it.each([['[1]'], ['3'], [[1]], ['{bad']])('rejects %j', (raw) => {
    expect(() => parseToolInput(raw)).toThrow();
  });
});
