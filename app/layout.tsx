import type { Metadata } from 'next';
import './globals.css';
import SiteTools from '@/components/SiteTools';
import { SHOP } from '@/lib/shop';

export const metadata: Metadata = {
  title: `${SHOP.name} | WebMCP starter`,
  description:
    'A working WebMCP implementation for Next.js.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* The origin trial token. Register your own origin at
            https://developer.chrome.com/origintrials and put the token in
            .env.local as WEBMCP_ORIGIN_TRIAL_TOKEN.

            You do NOT need one to run this locally: enable
            chrome://flags/#enable-webmcp-testing and restart instead. The
            token is only for a deployed origin. Emitted conditionally so the
            tag is absent rather than empty when the variable is unset.

            The page is prerendered, so the variable is read at `next build`.
            Set it before building; setting it only when the server starts
            ships a page with no tag. */}
        {process.env.WEBMCP_ORIGIN_TRIAL_TOKEN && (
          <meta
            httpEquiv="origin-trial"
            content={process.env.WEBMCP_ORIGIN_TRIAL_TOKEN}
          />
        )}
      </head>
      <body>
        {children}
        {/* Mounted once, at the root, because these tools describe the shop
            rather than any one page. Renders the WebMCP Tools panel.

            Takes no props on purpose: this layout is a Server Component, and
            a tool carries an `execute` function that cannot cross into a
            Client Component. See the comment in SiteTools.tsx. */}
        <SiteTools />
      </body>
    </html>
  );
}
