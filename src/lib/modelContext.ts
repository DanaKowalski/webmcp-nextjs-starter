// src/lib/modelContext.ts

/* The browser side of WebMCP, in one place. Everything that touches
   `modelContext` goes through here, so the trial's moving parts (two entry
   points, two argument formats) are handled once. Drop the fallbacks when the
   trial closes. */

/** The page's model context, or undefined in any browser without WebMCP. */
export function getModelContext(): WebMCP.ModelContext | undefined {
  if (typeof document === 'undefined') return undefined;
  /* The spec and Chrome's docs use `document`. Earlier trial builds used
     `navigator`. */
  return document.modelContext ?? navigator.modelContext;
}

/** A registered tool by name, or undefined if this browser cannot call tools
    or nothing by that name is registered. */
export async function findRegisteredTool(
  mc: WebMCP.ModelContext | undefined,
  name: string,
): Promise<WebMCP.RegisteredTool | undefined> {
  if (!mc?.getTools || !mc.executeTool) return undefined;
  return (await mc.getTools()).find((tool) => tool.name === name);
}

const PARSE_ERROR = /parse input/i;

/**
 * Calls a registered tool the way an agent would.
 *
 * Chrome's docs pass the arguments as a plain object, and deprecate the JSON
 * string form from Chrome 155. Chrome 151 rejects the object with "Failed to
 * parse input arguments". So this tries the object and retries as a string
 * only on that error, never on one the tool threw, so no tool runs twice.
 */
export async function executeTool(
  mc: WebMCP.ModelContext,
  tool: WebMCP.RegisteredTool,
  input: WebMCP.ToolInput,
): Promise<string | null> {
  if (!mc.executeTool) throw new Error('This browser cannot call tools.');
  try {
    return await mc.executeTool(tool, input);
  } catch (err) {
    if (!PARSE_ERROR.test(String(err))) throw err;
    return await mc.executeTool(tool, JSON.stringify(input));
  }
}

/**
 * The arguments a tool's `execute` received, as an object. Current builds
 * pass an object. Accepting a JSON string as well costs nothing and covers a
 * build that forwards the string form untouched.
 */
export function parseToolInput(raw: unknown): WebMCP.ToolInput {
  const value = typeof raw === 'string' ? JSON.parse(raw || '{}') : raw;
  if (value === null || value === undefined) return {};
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Tool input must be an object.');
  }
  return value as WebMCP.ToolInput;
}
