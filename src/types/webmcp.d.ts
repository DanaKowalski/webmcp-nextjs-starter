// src/types/webmcp.d.ts

/* Hand-written rather than taken from the `webmcp-types` package.
   https://developer.chrome.com/docs/ai/webmcp

   The spec and Chrome's docs use `document.modelContext`. Earlier versions
   of the API used `navigator.modelContext`, so a page that wants to work
   across the trial reads both.
   The published typings describe only the new surface, which means they
   cannot type the fallback path. A handful of interfaces was less trouble
   than a dependency that describes half the browsers you are trying to support.

   Everything here is optional at the type level on purpose. No browser
   outside the trial has any of it, so every call site is forced to check
   before using it. */

declare namespace WebMCP {
  /** Arguments arrive already parsed, shaped by the tool's own inputSchema. */
  type ToolInput = Record<string, unknown>;

  interface ToolResult {
    content: { type: 'text'; text: string }[];
  }

  interface ToolAnnotations {
    /** The tool reads and never writes. Lets a client skip a confirmation. */
    readOnlyHint?: boolean;
    /** The tool can return content this site did not author. */
    untrustedContentHint?: boolean;
    /** In the spec and Chrome's docs. Defaults to false. */
    consequentialHint?: boolean;
    /** In the spec. Chrome 156 and later. Defaults to false. */
    debugging?: boolean;
  }

  interface Tool {
    /** 1-128 characters: ASCII alphanumeric plus `_`, `-` and `.`. */
    name: string;
    title?: string;
    /** Chrome's guidance caps this at 500 characters. */
    description: string;
    inputSchema?: object;
    annotations?: ToolAnnotations;
    /** `options.signal` aborts when the user or agent cancels the call. Optional
        here because older trial builds may not pass it. */
    execute: (
      input: ToolInput,
      options?: { signal: AbortSignal }
    ) => ToolResult | Promise<ToolResult>;
  }

  interface RegisterToolOptions {
    /** Aborting unregisters the tool. */
    signal?: AbortSignal;
    /** Origins allowed to call this tool. Defaults to this one alone. */
    exposedTo?: string[];
  }

  /** A tool as `getTools()` returns it. Older trial builds hand back
      `inputSchema` as a JSON string rather than an object. */
  interface RegisteredTool {
    name: string;
    title?: string;
    description: string;
    inputSchema?: object | string;
    annotations?: ToolAnnotations;
  }

  interface ModelContext extends EventTarget {
    registerTool(tool: Tool, options?: RegisterToolOptions): Promise<void> | void;
    getTools?(options?: { fromOrigins?: string[] }): Promise<RegisteredTool[]>;
    /* Takes a plain object per the current docs, a JSON string on Chrome 151.
       Resolves to the result as a string, or null when the tool triggers a
       navigation. `signal` cancels a pending call. */
    executeTool?(
      tool: RegisteredTool,
      input?: object | string,
      options?: { signal?: AbortSignal }
    ): Promise<string | null>;
    ontoolchange?: ((event: Event) => void) | null;
    ontoolactivated?: ((event: Event) => void) | null;
    ontoolcancel?: ((event: Event) => void) | null;
  }
}

interface Document {
  readonly modelContext?: WebMCP.ModelContext;
}

interface Navigator {
  readonly modelContext?: WebMCP.ModelContext;
}
