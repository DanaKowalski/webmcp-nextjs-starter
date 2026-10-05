'use client';

import { useEffect, useRef, useState } from 'react';

/* A code block with a copy button, because the whole point of the snippet on
   the page is that someone pastes it into DevTools.

   Takes the code as a string rather than as children. A string crosses the
   server/client boundary without complaint, where JSX children would drag
   this component's parent into the client graph for no reason. */
export default function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Clearing on unmount, so a copy immediately before navigating away does
     not leave a timer holding a setState for a component that is gone. */
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = async () => {
    try {
      /* Undefined on an insecure origin, and it throws if the permission is
         refused. Either way the fallback is to select the text so the person
         can still press Ctrl+C, which beats a button that looks broken. */
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      const pre = preRef.current;
      if (!pre) return;
      const range = document.createRange();
      range.selectNodeContents(pre);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  };

  return (
    <div className="codeblock">
      <button type="button" className="copy" onClick={copy}>
        {copied ? 'Copied' : 'Copy'}
      </button>
      {/* Announced separately from the button label. Swapping the label alone
          is silent to a screen reader that has already read the button. */}
      <span aria-live="polite" className="offscreen">
        {copied ? 'Copied to clipboard' : ''}
      </span>
      <pre ref={preRef}>
        <code>{code}</code>
      </pre>
    </div>
  );
}
