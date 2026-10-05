# webmcp-nextjs-starter

A Next.js app with working [WebMCP](https://developer.chrome.com/docs/ai/webmcp) tools and a panel that lists every tool, runs it, and logs every call.

## Run it

```bash
git clone https://github.com/DanaKowalski/webmcp-nextjs-starter
cd webmcp-nextjs-starter
npm install
npm run dev
```

Turn on `chrome://flags/#enable-webmcp-testing` (Chrome 149+), restart, and open `http://localhost:3000`. WebMCP needs https or localhost.

## Call the tools from the console

```js
const mc = document.modelContext ?? navigator.modelContext;
(await mc.getTools()).map((t) => t.name);
```

Paste this helper once:

```js
window.call = async (name, args = {}) => {
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
};
```

```js
call('get_services')
call('get_quote', { service: 'wheel-build', collection: true })
call('check_service_area', { town: 'Bramley' })
call('start_booking', { name: 'Sam Ellis', email: 'sam@example.com', town: 'Bramley', service: 'tune-up' })
```

`start_booking` fills the form. The person presses Send.

## Files

| File | What it is |
| --- | --- |
| `src/lib/tools.ts` | The four tools |
| `src/lib/shop.ts` | The data the page and tools share |
| `src/lib/modelContext.ts` | Finds the model context, calls a tool, parses input |
| `src/components/ModelContextTools.tsx` | Registers tools, renders nothing |
| `src/components/SiteTools.tsx` | Wires the tools and the panel into the layout |
| `src/types/webmcp.d.ts` | Types for `document.modelContext` and `navigator.modelContext` |

## Notes

- **Argument format.** Chrome 151 wants a JSON string. Chrome's [docs](https://developer.chrome.com/docs/ai/webmcp/imperative-api) pass an object and deprecate the string from Chrome 155. `executeTool` tries the object, then the string, only on the parse error.
- **Unregistering.** There is no `unregisterTool`. Abort the `signal` passed to `registerTool`.
- **Entry point.** Read `document.modelContext`, falling back to `navigator.modelContext`.
- **Server Components.** A tool's `execute` function cannot be passed from a Server Component. Import the tools in a client component (`SiteTools.tsx`).

## Deploy

Register your origin at [developer.chrome.com/origintrials](https://developer.chrome.com/origintrials) and set `WEBMCP_ORIGIN_TRIAL_TOKEN` before `next build`. Serve over https.

## Development

```bash
npm run check   # lint, typecheck, tests
npm run build
```

## License

MIT
