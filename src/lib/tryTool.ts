// src/lib/tryTool.ts

import { asTryIt, tryItCallCount, type CallLog } from '@/lib/callLog';
import { executeTool, findRegisteredTool, getModelContext } from '@/lib/modelContext';

/**
 * The panel's Run button, for a set of tools already wrapped by
 * `withLogging`.
 *
 * Goes through the browser's own WebMCP path when the tool is registered, so
 * a Try it call behaves exactly like an agent's. Otherwise it calls the tool
 * directly, which is what lets the panel work in every browser.
 *
 * Never throws. A failure inside the tool is already in the log. A failure
 * before the tool ran (lookup, the browser refusing the call, an unknown
 * name) is logged here, so pressing Run always leaves an entry.
 */
export function createTryTool(loggedTools: WebMCP.Tool[], log: CallLog) {
  return async function tryTool(name: string, input: WebMCP.ToolInput): Promise<void> {
    const before = tryItCallCount();
    try {
      await asTryIt(async () => {
        const mc = getModelContext();
        const registered = await findRegisteredTool(mc, name);
        if (mc && registered) return executeTool(mc, registered, input);

        const tool = loggedTools.find((t) => t.name === name);
        if (!tool) throw new Error(`No tool called ${name}.`);
        return tool.execute(input);
      });
    } catch (error) {
      if (tryItCallCount() === before) log.start(name, input, 'Try it')({ error });
    }
  };
}
