/* Reading the frontmatter of the content files.
 *
 * The content guards work on the parsed object, not on the text, so that they
 * stay pure functions that a test can feed a broken event to. Parsing is left
 * to `yaml` — a development dependency, never shipped — rather than to a
 * hand-rolled regular expression: the `speakers` list is nested, and a
 * half-parser for it would be the most fragile thing in the suite.
 */
import { slug as githubSlug } from 'github-slugger';
import { parse } from 'yaml';
import { filesWithExtension, read, repoRoot } from './paths.ts';
import { join } from 'node:path';

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;

export type Entry = {
  /** The identifier the references use — the one astro:content hands out. */
  id: string;
  /** Path relative to the repository root, for the violation messages. */
  path: string;
  data: Record<string, unknown>;
  /** Why the frontmatter could not be read, when it could not. */
  error?: string;
};

export function frontmatterOf(
  markdown: string,
  path = 'the file',
): Record<string, unknown> {
  const match = FRONTMATTER.exec(markdown);
  if (!match) return {};

  let parsed: unknown;
  try {
    parsed = parse(match[1] ?? '');
  } catch (error) {
    // Without the file name this arrives in CI as a bare YAMLParseError, and
    // because the collections are read while the tests are being collected, it
    // takes the whole test file down with it: every guard in sources.test.ts
    // is reported as not run, over a colon in one event's title.
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`the frontmatter of ${path} is not valid YAML: ${detail}`);
  }

  return typeof parsed === 'object' && parsed !== null
    ? (parsed as Record<string, unknown>)
    : {};
}

/**
 * The identifier astro:content gives an entry, worked out the same way.
 *
 * Not the file name: the glob loader slugifies every path segment and joins
 * them with `/`, and an explicit `slug` in the frontmatter wins over both. The
 * file name is right only as long as every file is already a slug — which is
 * true of the four samples in the repository and is exactly why deriving it
 * with `basename()` looked correct. The day a cycle is filed as
 * `4-Città Aperta.md`, Astro calls it `4-citta-aperta`, the reference from the
 * event resolves to it, and the lookup here finds nothing: the kicker guard
 * then compares against an empty cycle name and stops checking, silently.
 */
export function entryId(
  relativePath: string,
  data: Record<string, unknown> = {},
): string {
  if (typeof data.slug === 'string' && data.slug) return data.slug;

  return relativePath
    .replace(/\.md$/, '')
    .split('/')
    .map((segment) => githubSlug(segment))
    .join('/')
    .replace(/\/index$/, '');
}

/**
 * Every entry of a collection, parsed.
 *
 * A file that does not parse is carried, not thrown: this runs while vitest is
 * still collecting the tests, so a `throw` here takes the whole test file down
 * — every guard in it reported as not run, over one stray colon in one title.
 * The error travels on the entry instead, and one test fails, saying which
 * file and why.
 */
export function collectionEntries(collection: string): Entry[] {
  const dir = join(repoRoot, 'src/content', collection);
  const prefix = `src/content/${collection}/`;

  return filesWithExtension(dir, ['.md']).map((path) => {
    const relative = path.slice(prefix.length);
    try {
      const data = frontmatterOf(read(path), path);
      return { id: entryId(relative, data), path, data };
    } catch (error) {
      return {
        id: entryId(relative),
        path,
        data: {},
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
}
