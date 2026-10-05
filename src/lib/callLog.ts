// src/lib/callLog.ts

import { parseToolInput } from '@/lib/modelContext';

/* What the WebMCP Tools panel shows: every tool call on this page, who made
   it, what went in and what came back.

   Logging happens by wrapping each tool's execute before it is registered,
   so every way in is covered: an agent, the panel's Try it, or someone
   calling from the console. The wrapper does not change what a tool returns
   or throws.

   The log and the panel's open state are kept in sessionStorage so they
   survive a reload. Storage can be missing or throw (private windows,
   blocked storage) and the panel works without it. */

export type CallSource = 'Agent' | 'Try it';
export type CallStatus = 'running' | 'done' | 'error';

export interface CallEntry {
  id: string;
  tool: string;
  source: CallSource;
  time: string;
  input: string;
  output?: string;
  status: CallStatus;
}

export interface CallLogState {
  entries: CallEntry[];
  open: boolean;
  /** The panel has been opened at least once this visit. */
  seen: boolean;
}

export interface CallLog {
  subscribe(listener: () => void): () => void;
  getSnapshot(): CallLogState;
  start(
    tool: string,
    input: unknown,
    source: CallSource,
  ): (outcome: { result?: unknown; error?: unknown }) => void;
  setOpen(open: boolean): void;
  clear(): void;
}

const MAX_ENTRIES = 20;

/* Tool results are { content: [{ type: 'text', text }] }. Show just the text
   when that is the shape. */
function toText(value: unknown): string {
  if (typeof value === 'string') return value;
  const content = (value as WebMCP.ToolResult | null)?.content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (part.type === 'text' ? part.text : `[${part.type}]`))
      .join('\n');
  }
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

const shorten = (text: string, max = 1600) =>
  text.length > max ? `${text.slice(0, max)}\n…` : text;

const timeNow = () =>
  new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

const storage = (): Storage | undefined => {
  try {
    return typeof window === 'undefined' ? undefined : window.sessionStorage;
  } catch {
    return undefined;
  }
};

/* Storage is outside this code's control, so a saved entry is checked before
   it is rendered. */
const isEntry = (value: unknown): value is CallEntry => {
  const e = value as Partial<CallEntry> | null;
  return (
    typeof e?.id === 'string' &&
    typeof e.tool === 'string' &&
    typeof e.time === 'string' &&
    typeof e.input === 'string' &&
    (e.source === 'Agent' || e.source === 'Try it') &&
    (e.status === 'done' || e.status === 'error') &&
    (e.output === undefined || typeof e.output === 'string')
  );
};

export function createCallLog(storageKey: string): CallLog {
  const load = (): CallLogState => {
    try {
      const saved = JSON.parse(storage()?.getItem(storageKey) ?? 'null');
      return {
        entries: Array.isArray(saved?.entries) ? saved.entries.filter(isEntry) : [],
        open: saved?.open === true,
        seen: saved?.seen === true,
      };
    } catch {
      return { entries: [], open: false, seen: false };
    }
  };

  let state = load();
  let nextId = 0;
  const listeners = new Set<() => void>();

  /* A new state object on every change, never an edit in place: the panel
     reads this through useSyncExternalStore, which re-renders only when the
     snapshot is a different object. */
  const update = (next: CallLogState) => {
    state = next;
    try {
      /* A call still running when the page unloads never finishes, so it is
         not saved: it would come back stuck on 'Running…'. */
      storage()?.setItem(
        storageKey,
        JSON.stringify({
          open: state.open,
          seen: state.seen,
          entries: state.entries.filter((e) => e.status !== 'running'),
        }),
      );
    } catch {
      /* Not critical. */
    }
    listeners.forEach((listener) => listener());
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    getSnapshot: () => state,

    start(tool, input, source) {
      const id = `${Date.now()}-${nextId++}`;
      update({
        ...state,
        entries: [
          {
            id,
            tool,
            source,
            time: timeNow(),
            input: shorten(toText(input)),
            status: 'running' as const,
          },
          ...state.entries,
        ].slice(0, MAX_ENTRIES),
      });

      return ({ result, error }) => {
        update({
          ...state,
          entries: state.entries.map((entry) =>
            entry.id !== id
              ? entry
              : {
                  ...entry,
                  status: error ? 'error' : 'done',
                  output: shorten(
                    error
                      ? String((error as Error)?.message ?? error)
                      : toText(result),
                  ),
                },
          ),
        });
      };
    },

    setOpen(open) {
      update({ ...state, open, seen: state.seen || open });
    },

    clear() {
      update({ ...state, entries: [] });
    },
  };
}

/* Who is calling. The browser runs every call through the same execute, so
   the caller says who it is around the call and the wrapper reads it. A
   count rather than a flag, so two overlapping Try it runs do not clear each
   other. An agent call that overlaps one of these gets its label; this is a
   demo, and that is an acceptable miss. */
let trying = 0;
let tryItStarts = 0;

export async function asTryIt<T>(run: () => T | Promise<T>): Promise<T> {
  trying++;
  try {
    return await run();
  } finally {
    trying--;
  }
}

/** How many Try it calls have reached a logged tool so far. A caller that
    compares this before and after a call can tell whether a failure happened
    before the tool ran, and so was never logged. */
export const tryItCallCount = () => tryItStarts;

const currentSource = (): CallSource => {
  if (!trying) return 'Agent';
  tryItStarts++;
  return 'Try it';
};

export function withLogging(
  tools: WebMCP.Tool[],
  log: CallLog,
): WebMCP.Tool[] {
  return tools.map((tool) => ({
    ...tool,
    execute: async (raw, options) => {
      /* Logged before parsing, so input that fails to parse still shows up. */
      const finish = log.start(tool.name, raw, currentSource());
      try {
        const result = await tool.execute(parseToolInput(raw), options);
        finish({ result });
        return result;
      } catch (error) {
        finish({ error });
        throw error;
      }
    },
  }));
}
