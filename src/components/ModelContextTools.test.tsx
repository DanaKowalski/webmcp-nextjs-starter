// @vitest-environment jsdom
import { StrictMode } from 'react';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ModelContextTools from '@/components/ModelContextTools';

const tool = (name: string): WebMCP.Tool => ({
  name,
  description: name,
  execute: () => ({ content: [] }),
});
const TOOLS = [tool('a'), tool('b'), tool('c')];

/* A fake model context that keeps the signal each tool was registered with,
   and counts a tool as live until its signal aborts. */
function installContext(registerTool?: WebMCP.ModelContext['registerTool']) {
  const calls: { name: string; signal: AbortSignal }[] = [];
  const mc = {
    registerTool: vi.fn(
      registerTool ??
        ((t: WebMCP.Tool, options?: WebMCP.RegisterToolOptions) => {
          calls.push({ name: t.name, signal: options!.signal! });
        }),
    ),
  };
  Object.defineProperty(document, 'modelContext', { value: mc, configurable: true });
  const live = () => calls.filter((c) => !c.signal.aborted).map((c) => c.name);
  return { mc, calls, live };
}

afterEach(() => {
  delete (document as { modelContext?: unknown }).modelContext;
  vi.restoreAllMocks();
});

describe('ModelContextTools', () => {
  it('registers every tool with one signal, and unregisters them on unmount', () => {
    const { calls, live } = installContext();
    const { unmount } = render(<ModelContextTools tools={TOOLS} />);

    expect(live()).toEqual(['a', 'b', 'c']);
    expect(new Set(calls.map((c) => c.signal)).size).toBe(1);

    unmount();
    expect(live()).toEqual([]);
  });

  it('leaves exactly one live set under strict mode', () => {
    const { calls, live } = installContext();
    render(
      <StrictMode>
        <ModelContextTools tools={TOOLS} />
      </StrictMode>,
    );
    expect(calls).toHaveLength(6);
    expect(live()).toEqual(['a', 'b', 'c']);
  });

  it('a tool the browser rejects does not stop the others', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const registered: string[] = [];
    installContext((t) => {
      if (t.name === 'b') throw new Error('bad descriptor');
      registered.push(t.name);
    });
    render(<ModelContextTools tools={TOOLS} />);
    expect(registered).toEqual(['a', 'c']);
    expect(warn).toHaveBeenCalledWith('WebMCP: could not register "b"', expect.any(Error));
  });

  it('ignores a rejection that arrives after its own abort', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    installContext(
      (_t, options) =>
        new Promise<void>((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const { unmount } = render(<ModelContextTools tools={TOOLS} />);
    unmount();
    await Promise.resolve();
    await Promise.resolve();
    expect(warn).not.toHaveBeenCalled();
  });

  it('does nothing in a browser without WebMCP', () => {
    expect(() => render(<ModelContextTools tools={TOOLS} />)).not.toThrow();
  });
});
