import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { HELPER_BODY, LIST_TOOLS } from '@/lib/consoleSnippets';

/* The README carries its own copy of the console snippets. This keeps the two
   from drifting apart. */
const readme = readFileSync(new URL('../../README.md', import.meta.url), 'utf8');

it('the README has the same console snippets as the page', () => {
  expect(readme).toContain(LIST_TOOLS);
  expect(readme).toContain(HELPER_BODY);
});
