/* Reading the frontmatter of the content files.
 *
 * The content guards work on the parsed object, not on the text, so that they
 * stay pure functions that a test can feed a broken event to. Parsing is left
 * to `yaml` — a development dependency, never shipped — rather than to a
 * hand-rolled regular expression: the `speakers` list is nested, and a
 * half-parser for it would be the most fragile thing in the suite.
 */
import { parse } from 'yaml';
import { filesWithExtension, read, repoRoot } from './paths.ts';
import { basename, join } from 'node:path';

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;

export type Entry = {
  /** The identifier the references use: the file name, without extension. */
  id: string;
  /** Path relative to the repository root, for the violation messages. */
  path: string;
  data: Record<string, unknown>;
};

export function frontmatterOf(markdown: string): Record<string, unknown> {
  const match = FRONTMATTER.exec(markdown);
  if (!match) return {};
  const parsed = parse(match[1] ?? '');
  return typeof parsed === 'object' && parsed !== null
    ? (parsed as Record<string, unknown>)
    : {};
}

/** Every entry of a collection, parsed. */
export function collectionEntries(collection: string): Entry[] {
  const dir = join(repoRoot, 'src/content', collection);
  return filesWithExtension(dir, ['.md']).map((path) => ({
    id: basename(path, '.md'),
    path,
    data: frontmatterOf(read(path)),
  }));
}
