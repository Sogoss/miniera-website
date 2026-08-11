/* Pulling <style> blocks out of markup.
 *
 * Two callers need it, on opposite layers. The source tests read the <style>
 * blocks of the .astro components, which are the only place a rule-4 double
 * declaration can still be seen: by the time the CSS reaches dist/ the
 * minifier has already collapsed it, so the evidence is gone. The dist reader
 * needs the same two lines to pick up the CSS Astro chose to inline rather
 * than emit as a file.
 */
export function extractStyleBlocks(markup: string): string[] {
  const blocks: string[] = [];
  const pattern = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(markup)) !== null) {
    blocks.push(match[1] ?? '');
  }
  return blocks;
}

/** The same blocks, concatenated, ready to hand to a guard. */
export function styleBlocksOf(markup: string): string {
  return extractStyleBlocks(markup).join('\n');
}
