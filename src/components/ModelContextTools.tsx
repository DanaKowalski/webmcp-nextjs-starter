'use client';

import { useEffect } from 'react';
import { getModelContext } from '@/lib/modelContext';

/**
 * Registers a set of WebMCP tools and renders nothing.
 *
 * Mount it as high as the tools are relevant: site-wide tools in the root
 * layout, page-specific tools on that page, so an agent is not offered
 * something it cannot use where it is standing.
 *
 * In a browser without WebMCP it does nothing at all.
 *
 * Pass a stable array, such as a module constant. A new array on every render
 * re-registers every tool on every render.
 */
export default function ModelContextTools({ tools }: { tools: WebMCP.Tool[] }) {
  useEffect(() => {
    const modelContext = getModelContext();
    if (!modelContext) return;

    /* Aborting unregisters every tool registered with this signal. That is
       also what keeps strict mode's mount, unmount, remount from registering
       the set twice. */
    const controller = new AbortController();

    for (const tool of tools) {
      /* One at a time, so a descriptor this build rejects costs that one
         tool, not the set. Logged in development, because a duplicate or
         invalid name otherwise just never shows up. A rejection after our own
         abort is expected and ignored. */
      const report = (err: unknown) => {
        if (controller.signal.aborted) return;
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`WebMCP: could not register "${tool.name}"`, err);
        }
      };
      try {
        Promise.resolve(
          modelContext.registerTool(tool, { signal: controller.signal }),
        ).catch(report);
      } catch (err) {
        /* Synchronous throw on an older build. */
        report(err);
      }
    }

    return () => controller.abort();
  }, [tools]);

  return null;
}
