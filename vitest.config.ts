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
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['test/unit/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'build',
          include: ['test/build/**/*.test.ts'],
          globalSetup: ['./test/support/build.ts'],
        },
      },
    ],
  },
});
