import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { asTryIt, createCallLog, withLogging } from '@/lib/callLog';

const KEY = 'test-log';

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
}

let storage: Storage;
beforeEach(() => {
  storage = memoryStorage();
  vi.stubGlobal('window', { sessionStorage: storage });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const saved = () => JSON.parse(storage.getItem(KEY) ?? 'null');

const echo: WebMCP.Tool = {
  name: 'echo',
  description: 'Echoes.',
  execute: (input) => ({ content: [{ type: 'text', text: `got ${input.word}` }] }),
};

describe('createCallLog', () => {
  it('records a call as running, then done with its output', () => {
    const log = createCallLog(KEY);
    const finish = log.start('echo', { word: 'hi' }, 'Agent');
    expect(log.getSnapshot().entries[0].status).toBe('running');

    finish({ result: { content: [{ type: 'text', text: 'got hi' }] } });
    expect(log.getSnapshot().entries[0]).toMatchObject({
      tool: 'echo',
      source: 'Agent',
      status: 'done',
      output: 'got hi',
    });
  });

  it('records a failure with its message', () => {
    const log = createCallLog(KEY);
    log.start('echo', {}, 'Agent')({ error: new Error('nope') });
    expect(log.getSnapshot().entries[0]).toMatchObject({ status: 'error', output: 'nope' });
  });

  it('keeps the newest 20 calls', () => {
    const log = createCallLog(KEY);
    for (let i = 0; i < 25; i++) log.start(`t${i}`, {}, 'Agent')({ result: 'x' });
    const { entries } = log.getSnapshot();
    expect(entries).toHaveLength(20);
    expect(entries[0].tool).toBe('t24');
  });

  it('does not save calls that are still running', () => {
    const log = createCallLog(KEY);
    log.start('slow', {}, 'Agent');
    log.start('fast', {}, 'Agent')({ result: 'x' });
    expect(saved().entries.map((e: { tool: string }) => e.tool)).toEqual(['fast']);
  });

  it('comes back after a reload, dropping anything malformed', () => {
    const first = createCallLog(KEY);
    first.start('echo', {}, 'Agent')({ result: 'x' });
    first.setOpen(true);
    const stored = saved();
    stored.entries.push({ id: 1, tool: '<b>' }, null);
    storage.setItem(KEY, JSON.stringify(stored));

    const reloaded = createCallLog(KEY).getSnapshot();
    expect(reloaded.open).toBe(true);
    expect(reloaded.seen).toBe(true);
    expect(reloaded.entries.map((e) => e.tool)).toEqual(['echo']);
  });

  it('works when storage throws', () => {
    vi.stubGlobal('window', {
      get sessionStorage(): Storage {
        throw new Error('blocked');
      },
    });
    const log = createCallLog(KEY);
    log.start('echo', {}, 'Agent')({ result: 'x' });
    expect(log.getSnapshot().entries).toHaveLength(1);
  });

  it('gives a new snapshot on every change and notifies listeners', () => {
    const log = createCallLog(KEY);
    const listener = vi.fn();
    const unsubscribe = log.subscribe(listener);
    const before = log.getSnapshot();
    log.clear();
    expect(log.getSnapshot()).not.toBe(before);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    log.setOpen(true);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('withLogging', () => {
  it('returns what the tool returns and logs it', async () => {
    const log = createCallLog(KEY);
    const [tool] = withLogging([echo], log);
    const result = await tool.execute({ word: 'hi' });
    expect(result.content[0].text).toBe('got hi');
    expect(log.getSnapshot().entries[0].output).toBe('got hi');
  });

  it('passes the abort signal through to the tool', async () => {
    const execute = vi.fn(() => ({ content: [] }));
    const [tool] = withLogging([{ ...echo, execute }], createCallLog(KEY));
    const { signal } = new AbortController();
    await tool.execute({}, { signal });
    expect(execute).toHaveBeenCalledWith({}, { signal });
  });

  it('accepts the arguments as a JSON string', async () => {
    const [tool] = withLogging([echo], createCallLog(KEY));
    const result = await tool.execute('{"word":"hi"}' as unknown as WebMCP.ToolInput);
    expect(result.content[0].text).toBe('got hi');
  });

  it('logs and rethrows input that does not parse', async () => {
    const log = createCallLog(KEY);
    const [tool] = withLogging([echo], log);
    await expect(tool.execute('{bad' as unknown as WebMCP.ToolInput)).rejects.toThrow();
    expect(log.getSnapshot().entries[0]).toMatchObject({ tool: 'echo', status: 'error' });
  });

  it('logs and rethrows a tool that throws', async () => {
    const log = createCallLog(KEY);
    const broken = { ...echo, execute: () => Promise.reject(new Error('broke')) };
    const [tool] = withLogging([broken], log);
    await expect(tool.execute({})).rejects.toThrow('broke');
    expect(log.getSnapshot().entries[0]).toMatchObject({ status: 'error', output: 'broke' });
  });

  it('labels calls made inside asTryIt', async () => {
    const log = createCallLog(KEY);
    const [tool] = withLogging([echo], log);
    await asTryIt(() => tool.execute({}));
    await tool.execute({});
    expect(log.getSnapshot().entries.map((e) => e.source)).toEqual(['Agent', 'Try it']);
  });
});
