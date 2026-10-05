'use client';

import ModelContextTools from '@/components/ModelContextTools';
import WebMcpPanel from '@/components/WebMcpPanel';
import { createCallLog, withLogging } from '@/lib/callLog';
import { TOOLS } from '@/lib/tools';
import { createTryTool } from '@/lib/tryTool';

/* Every call to these goes in the panel's log, whoever makes it. Built once,
   at module level, so ModelContextTools gets the stable array it asks for. */
const log = createCallLog('webmcp-panel');
const LOGGED_TOOLS = withLogging(TOOLS, log);
const tryTool = createTryTool(LOGGED_TOOLS, log);

/**
 * Wires this site's tools to the registration component and the WebMCP
 * Tools panel.
 *
 * It exists because `app/layout.tsx` is a Server Component, and a tool's
 * `execute` function cannot be passed from a Server Component to a Client
 * Component. Importing TOOLS here keeps them inside the client graph, so the
 * layout renders a component that takes no props.
 *
 * The panel is optional. Drop it and render
 * `<ModelContextTools tools={TOOLS} />` if you only want the tools.
 */
export default function SiteTools() {
  return (
    <>
      <ModelContextTools tools={LOGGED_TOOLS} />
      <WebMcpPanel tools={TOOLS} log={log} onTry={tryTool} />
    </>
  );
}
