/* Reading what the build actually published.
 *
 * For style, reading the source is not enough — the minifier can take things
 * out. Everything in this file therefore looks at dist/, never at src/.
 */
import { distDir, filesWithExtension, read, walk } from './paths.ts';

/** Files in dist/ that are worth scanning as text. */
const TEXT_EXTENSIONS = ['.html', '.css', '.js', '.mjs', '.json', '.svg', '.xml', '.txt'];

/**
 * All the CSS that reaches the browser, concatenated.
 *
 * Two sources, not one. Today Astro emits a single external
 * `dist/_astro/index.<hash>.css` — the hash changes whenever a token changes,
 * so the filename can never be hard-coded. But the stylesheet is only just
 * over Astro's inlining threshold, and the day it drops under, the same CSS
 * will arrive inside a `<style>` tag instead. Reading both means the guards
 * keep working through that switch instead of silently passing over an empty
 * string.
 */
export function readPublishedCss(): string {
  const pieces: string[] = [];

  for (const path of filesWithExtension(distDir, ['.css'])) {
    pieces.push(read(path));
  }

  for (const path of filesWithExtension(distDir, ['.html'])) {
    const html = read(path);
    const pattern = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null) {
      pieces.push(match[1] ?? '');
    }
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
