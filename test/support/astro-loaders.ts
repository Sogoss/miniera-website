/* A stand-in for `astro/loaders`, aliased in vitest.config.ts.
 *
 * The real one resolves — it is part of the installed astro — and it is stubbed
 * anyway: what these tests want out of src/content.config.ts is the shape of
 * the four schemas, and dragging a file-system loader into a unit test to get
 * at them would make the fastest layer of the suite depend on the slowest part
 * of the framework.
 */
export function glob(options: unknown): unknown {
  return options;
}
