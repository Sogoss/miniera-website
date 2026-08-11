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

/* Inline `style` attributes.
 *
 * They are CSS that reaches the browser exactly like the rest, and they are
 * the one place a guard reading only stylesheets cannot see: a `var()` written
 * in an attribute appears neither in dist/_astro/*.css nor in a <style> block.
 * The temporary page carries all its tokens this way, and setting a custom
 * property in the markup — `style={`--accent: ${colour}`}` — is the ordinary
 * Astro idiom for a value that changes per element, which is exactly what the
 * scroller will do with the cycle accent.
 *
 * Only literal attributes are seen. One written as an expression is opaque
 * until the build, which is where the published HTML makes it visible again.
 */
export function extractStyleAttributes(markup: string): string[] {
  const found: string[] = [];
  const pattern = /\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(markup)) !== null) {
    const value = match[1] ?? match[2] ?? '';
    if (value.trim()) found.push(value);
  }
  return found;
}

/**
 * The same attributes, each wrapped in a block so that a guard reads them as
 * ordinary CSS.
 *
 * The wrapping is not decoration: the guards recognise a declaration by the
 * `{` or `;` in front of it, and one block per attribute is also what keeps a
 * duplicate declaration inside a single attribute distinguishable from the
 * same property appearing in two different ones.
 */
export function styleAttributesOf(markup: string): string {
  return extractStyleAttributes(markup)
    .map((value) => `[style] { ${value} }`)
    .join('\n');
}
