/* Guards over the clip shapes.
 *
 * A `clip-path: url(#…)` resolves against a definition in the same document and
 * nowhere else: no import, no stylesheet, no fallback. Get it wrong and nothing
 * fails — the browser draws the photo unclipped, which looks like a photo
 * somebody decided not to clip. Both guards here are about that silence.
 *
 * They read the published page rather than the source, for the same reason the
 * cycle guard does: in the source a `clip-path` can be an expression and the
 * component that defines the shapes is an import, so only dist/ says what
 * actually ended up in one document together.
 */
import { stripMarkupComments } from './language.ts';
import { type Violation, lineNumber } from './types.ts';

/** Every shape a chunk of markup defines, with where it was defined.
 *
 *  Attributes are read by name, not by position: `<clipPath clipPathUnits="…"
 *  id="…">` is the same definition as the other way round, and a guard that
 *  saw only one of the two orders would stop watching a shape the day somebody
 *  reformatted the file. */
export function definedShapes(markup: string): { id: string; index: number }[] {
  const found: { id: string; index: number }[] = [];
  const pattern = /<clipPath\b([^>]*)>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(markup)) !== null) {
    const id = /(?<![-:\w])id\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(match[1] ?? '');
    if (!id) continue;
    found.push({ id: (id[1] ?? id[2] ?? id[3] ?? '').trim(), index: match.index });
  }
  return found;
}

/** The names of the shapes defined in a chunk of markup. */
export function clipShapeIds(markup: string): string[] {
  return definedShapes(stripMarkupComments(markup)).map((shape) => shape.id);
}

/**
 * Every shape a page asks for, in a style attribute or in a stylesheet.
 *
 * Both the direct form and the one held in a custom property. Rule 2 says style
 * is written with the tokens, so `--clip-portrait: url(#clip-clover-8)` and then
 * `clip-path: var(--clip-portrait)` is the natural shape for PR 6 to give the
 * guest portraits — and reading only `clip-path: url(…)` would have made this
 * guard pass over every page of that PR without looking at anything.
 */
function referencedShapes(css: string): Map<string, number> {
  const found = new Map<string, number>();
  const pattern = /(?:clip-path|--[a-z0-9-]+)\s*[:=]\s*["']?[^;}"']*?url\(\s*["']?#([^)"'\s]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(css)) !== null) {
    const id = (match[1] ?? '').trim();
    if (id && !found.has(id)) found.set(id, match.index);
  }
  return found;
}

/**
 * A page that asks for a shape it does not carry.
 *
 * The definitions live in `ClipShapes`, which the layout includes on every
 * page; this is what says so out of the published file, and what will catch the
 * first page that renders a clipped photo without going through the layout.
 *
 * `css` is the CSS that page receives, `markup` its HTML — the references can
 * be in either, the definitions only in the markup.
 */
export function checkClipShapeReferences(
  markup: string,
  css: string,
  path = 'the page',
): Violation[] {
  /* Comments blanked on both sides, and «both» means the CSS too — which it did
     not, while this comment already said it did. A `<style is:inline>` reaches
     dist/ verbatim, CycleAccents emits one, and a rule left commented out in it
     would have failed every page over markup that renders perfectly: the
     mistake the cycle guard made first, repeated one argument away. */
  const clean = stripMarkupComments(markup);

  const asked = new Map([
    ...referencedShapes(stripMarkupComments(css)),
    ...referencedShapes(clean),
  ]);
  if (asked.size === 0) return [];

  const defined = new Set(definedShapes(clean).map((shape) => shape.id));
  const violations: Violation[] = [];

  for (const [id, index] of asked) {
    if (defined.has(id)) continue;
    violations.push({
      rule: 'shapes',
      detail: `${path}: \`clip-path: url(#${id})\` with no \`<clipPath id="${id}">\` in the same page. A reference that resolves to nothing is not an error anywhere: the photo is simply published uncut. Either the page is not carrying the ClipShapes component, or the shape was renamed on one side only`,
    });
  }

  return violations;
}

/**
 * Two shapes with the same `id` in one page.
 *
 * The second one does not replace the first and does not complain: it is
 * ignored, so whatever asked for it gets a shape somebody else chose. This is
 * checkable today, while the guard above still waits for the first real use —
 * the shapes are defined from this PR and used from the next.
 */
export function checkDuplicateClipShapeIds(markup: string, path = 'the page'): Violation[] {
  const seen = new Map<string, number>();
  const violations: Violation[] = [];

  for (const { id, index } of definedShapes(stripMarkupComments(markup))) {
    const first = seen.get(id);
    if (first === undefined) {
      seen.set(id, index);
      continue;
    }
    violations.push({
      rule: 'shapes',
      detail: `${path}: \`<clipPath id="${id}">\` is defined twice, on lines ${lineNumber(markup, first)} and ${lineNumber(markup, index)}. The second definition is ignored rather than refused, so every reference to that shape silently takes the first one`,
    });
  }

  return violations;
}
