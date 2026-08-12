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

/**
 * Every published page with the CSS that page actually receives: the
 * stylesheets of dist/ plus its own `<style>` blocks.
 *
 * readPublishedCss() concatenates everything, which is what the guards over the
 * tokens want — a name declared anywhere is declared. The cycle accents are the
 * opposite question: a rule emitted by a component only reaches the pages that
 * carry the component, so «the rules exist somewhere in dist/» would pass on a
 * page that has none of them.
 */
export function publishedPages(): { path: string; html: string; css: string }[] {
  const stylesheets = filesWithExtension(distDir, ['.css']).map(read).join('\n');

  return filesWithExtension(distDir, ['.html']).map((path) => {
    const html = read(path);
    return { path, html, css: [stylesheets, ...extractStyleBlocks(html)].join('\n') };
  });
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/**
 * The published markup with its character references turned back into
 * characters.
 *
 * Anything compared against the content has to go through here first. Astro
 * escapes what it renders — `quarant'anni` reaches dist/ as `quarant&#39;anni`
 * — so a test that read the frontmatter and looked for it in the page would go
 * red on any Italian string carrying an apostrophe, which is most of them: a
 * role like `coordinatrice dell'archivio`, a venue named `Circolo L'Isola`, a
 * note written by hand. The failure would name a test and not the file, over a
 * page that is perfectly correct.
 */
export function decodeEntities(html: string): string {
  return html
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&([a-z]+);/gi, (whole, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? whole);
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
