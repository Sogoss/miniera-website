/* Reading what the build actually published.
 *
 * For style, reading the source is not enough — the minifier can take things
 * out. Everything in this file therefore looks at dist/, never at src/.
 */
import { dirname, join } from 'node:path';
import { distDir, exists, filesWithExtension, read, walk } from './paths.ts';
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
  return filesWithExtension(distDir, ['.html'])
    .filter((path) => !copiedFromPublic(path))
    .map((path) => {
      const html = read(path);
      return {
        path,
        html,
        css: [...linkedStylesheets(html, path), ...extractStyleBlocks(html)].join('\n'),
      };
    });
}

/**
 * A file Astro copied out of public/ rather than rendered.
 *
 * Those are not ours and cannot be held to what the layout guarantees: PR 12
 * drops the Sveltia CMS shell at `public/admin/index.html`, which has no
 * `lang`, no Open Graph, no skip link and no clip shapes. Handing it to the
 * document guards would turn five assertions red at once over a page nobody
 * here wrote, and CLAUDE.md does not allow switching a test off to get past it.
 *
 * The same holds for anything else that arrives whole: the Sveltia bundle is
 * compiled Svelte, and asking it to honour «no UI framework in the published
 * site» would be asking it not to be what it is. What that rule is about is
 * what *this* design system ships.
 */
export function copiedFromPublic(path: string): boolean {
  return exists(path.replace(/^dist\//, 'public/'));
}

/**
 * The stylesheets a page actually links, read out of dist/.
 *
 * Not every .css in dist/, which is what this used to hand over: Astro emits a
 * stylesheet per entrypoint, so the day the accent rules stop being inline — PR
 * 5 moves the component into the layout and someone drops `is:inline`, or a
 * group of routes gets its own bundle — a page that links none of them would
 * still have been handed another page's, and the guard that asks «do the rules
 * this page needs reach this page» would answer with somebody else's file.
 */
function linkedStylesheets(html: string, pagePath: string): string[] {
  const found: string[] = [];
  const links = /<link\b[^>]*>/gi;
  let link: RegExpExecArray | null;

  while ((link = links.exec(html)) !== null) {
    if (!/\brel\s*=\s*["']?stylesheet\b/i.test(link[0])) continue;

    const href = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(link[0]);
    const url = (href?.[1] ?? href?.[2] ?? href?.[3] ?? '').split('?')[0]?.trim() ?? '';
    // Anything served from somewhere else is not ours to read — and there is
    // nothing of the sort in this project, which self-hosts even its fonts.
    if (!url || /^[a-z]+:/i.test(url) || url.startsWith('//')) continue;

    const file = url.startsWith('/')
      ? join('dist', url.slice(1))
      : join(dirname(pagePath), url);
    if (exists(file)) found.push(read(file));
  }

  return found;
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
