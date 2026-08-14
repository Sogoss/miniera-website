import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { blindPlugin } from './scripts/blind.mjs';

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

/* `npm run test:mutate` blinds one check at a time and asks whether the suite
   notices. It used to do that by editing the file on disk; it now says which
   check in an environment variable and this plugin makes the substitution while
   the module is being loaded — which is what lets sixty-five of these runs
   happen at once instead of one after another. Absent the variable it is null,
   and a plain `npm test` never sees it. See scripts/blind.mjs. */
const blinding = blindPlugin();
const plugins = blinding ? [blinding] : [];

/* Test files share a worker environment instead of getting a fresh one each. It
   is a third off every run — 5,5s to 3,7s — and `test:mutate` is sixty-five of
   those runs.
   What is given up is isolation *between test files*, which this suite does not
   use: every layer here reads files and computes, and the one piece of shared
   state — the build in test/support/build.ts — is a globalSetup that runs once
   either way. Declared inside each project and not once at the root, because at
   the root it is accepted and ignored: the same command was 5,5s with it and
   3,7s with `--isolate=false` on the command line, which is how it was found. */
const isolate = false;

export default defineConfig({
  test: {
    projects: [
      {
        plugins,
        resolve: { alias },
        test: {
          name: 'unit',
          include: ['test/unit/**/*.test.ts'],
          isolate,
        },
      },
      {
        plugins,
        resolve: { alias },
        test: {
          name: 'build',
          include: ['test/build/**/*.test.ts'],
          globalSetup: ['./test/support/build.ts'],
          isolate,
        },
      },
    ],
  },
});
