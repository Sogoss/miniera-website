import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/* Two layers, as set out in docs/piano.md.
 *
 * `unit` is pure and fast: the guards run against hand-written fixtures — the
 * negative cases that prove each guard would actually fail — and against the
 * source files.
 *
 * `build` asserts on what really lands in dist/, which is the only place the
 * constraints in CLAUDE.md can be checked honestly, because they are about the
 * published file and not about the source. It carries the globalSetup that
 * builds once for the whole layer.
 */

/* `astro:content` is a virtual module: it exists inside a build and nowhere
   else, so importing src/content.config.ts outside one needs somewhere for it
   to resolve. That import is the point — the CMS guards compare the config
   against the real Zod schema, and any list of field names written in a test
   would be a third copy of what they exist to keep in step. */
const alias = {
  'astro:content': fileURLToPath(new URL('./test/support/astro-content.ts', import.meta.url)),
  'astro/loaders': fileURLToPath(new URL('./test/support/astro-loaders.ts', import.meta.url)),
};

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'unit',
          include: ['test/unit/**/*.test.ts'],
        },
      },
      {
        resolve: { alias },
        test: {
          name: 'build',
          include: ['test/build/**/*.test.ts'],
          globalSetup: ['./test/support/build.ts'],
        },
      },
    ],
  },
});
