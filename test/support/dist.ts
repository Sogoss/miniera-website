/* Reading what the build actually published.
 *
 * For style, reading the source is not enough — the minifier can take things
 * out. Everything in this file therefore looks at dist/, never at src/.
 */
import { distDir, filesWithExtension, read, walk } from './paths.ts';
import { extractStyleBlocks, styleAttributesOf } from './styles.ts';

/** Files in dist/ that are worth scanning as text. */
const TEXT_EXTENSIONS = ['.html', '.css', '.js', '.mjs', '.json', '.svg', '.xml', '.txt'];

/**
 * All the CSS that reaches the browser, concatenated.
 *
 * Three sources, not one. Today Astro emits a single external
 * `dist/_astro/index.<hash>.css` — the hash changes whenever a token changes,
 * so the filename can never be hard-coded. But the stylesheet is only just
 * over Astro's inlining threshold, and the day it drops under, the same CSS
 * will arrive inside a `<style>` tag instead. Reading both means the guards
 * keep working through that switch instead of silently passing over an empty
 * string.
 *
 * The third source is the inline `style` attributes of the published HTML.
 * They were missing at first and the gap was real: a `var()` written in an
 * attribute is in no stylesheet at all, so a token left behind by a rename
 * survived the whole suite. Whatever an attribute declares or reads reaches
 * the browser like the rest, and every guard here is better off seeing it.
 */
export function readPublishedCss(): string {
  const pieces: string[] = [];

  for (const path of filesWithExtension(distDir, ['.css'])) {
    pieces.push(read(path));
  }

  for (const path of filesWithExtension(distDir, ['.html'])) {
    const html = read(path);
    pieces.push(...extractStyleBlocks(html));
    pieces.push(styleAttributesOf(html));
  }

  return pieces.join('\n');
}

/** Every published text file, with its contents. */
export function readPublishedFiles(): { path: string; text: string }[] {
  return walk(distDir)
    .filter((path) => TEXT_EXTENSIONS.some((extension) => path.endsWith(extension)))
    .map((path) => ({ path, text: read(path) }));
}

/** Every published file, including the binary ones. */
export function listPublishedFiles(): string[] {
  return walk(distDir);
}
