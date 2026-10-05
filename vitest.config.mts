import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    /* Library tests run in Node. Component tests opt in to a DOM with a
       `@vitest-environment jsdom` comment at the top of the file. Globals are
       on so Testing Library can register its own cleanup after each test. */
    environment: 'node',
    globals: true,
  },
});
