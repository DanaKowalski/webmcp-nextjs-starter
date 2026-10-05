// src/lib/consoleSnippets.ts

/* The snippets the page and the README give people to paste into DevTools.
   They are the console copy of `getModelContext` and `executeTool` in
   modelContext.ts, and have to be strings because they run in the console,
   not in the app. consoleSnippets.test.ts checks the README still matches. */

export const LIST_TOOLS = `const mc = document.modelContext ?? navigator.modelContext;
(await mc.getTools()).map((t) => t.name);`;

/* One helper rather than a self-contained snippet per call, because pasting
   `const mc = ...` twice in one console session is a redeclaration error. */
export const HELPER_BODY = `window.call = async (name, args = {}) => {
  const mc = document.modelContext ?? navigator.modelContext;
  const tool = (await mc.getTools()).find((t) => t.name === name);
  if (!tool) return console.error('No tool called ' + name);
  let raw;
  try {
    raw = await mc.executeTool(tool, args);
  } catch (err) {
    if (!/parse input/i.test(String(err))) throw err;
    raw = await mc.executeTool(tool, JSON.stringify(args));
  }
  try {
    console.log(JSON.parse(raw).content[0].text);
  } catch {
    console.log(raw);
  }
};`;

export const HELPER = `// Paste this once. Arguments go in as an object, falling back to
// a JSON string on older builds. The result comes back as a string.
${HELPER_BODY}`;
