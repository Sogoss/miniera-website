/* A stand-in for `astro:content`, so that the tests can read the real schema.
 *
 * `src/content.config.ts` is where the fields of this site are declared, and
 * the CMS guards have to compare against *that* — not against a list of names
 * copied into a test, which would be a third copy drifting alongside the two
 * it was written to keep together.
 *
 * The module it imports, `astro:content`, only exists inside a build: vitest
 * resolves it here instead, through the alias in vitest.config.ts. Two of the
 * three things it exports are trivial — `defineCollection` hands the object
 * back, `z` is the same zod Astro uses — and the third has to be recognisable
 * afterwards: a `reference('cicli')` and an `image()` both look like plain
 * strings once Zod has them, and a guard that could not tell them apart could
 * not say that the CMS points its relation at the right collection.
 */
import { z } from 'astro/zod';

export { z };

export const REFERENCED_COLLECTION = Symbol('referenced collection');
export const IS_IMAGE = Symbol('image field');

export function defineCollection<T>(config: T): T {
  return config;
}

/** A reference to another collection, carrying which one it points at. */
export function reference(collection: string) {
  const schema = z.string();
  Object.defineProperty(schema, REFERENCED_COLLECTION, { value: collection });
  return schema;
}

/** What Astro hands the schema factory as `image`. */
export function image() {
  const schema = z.string();
  Object.defineProperty(schema, IS_IMAGE, { value: true });
  return schema;
}
