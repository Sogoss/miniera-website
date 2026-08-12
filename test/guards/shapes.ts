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

/* What it takes for an element to draw something. A dimension written as zero
   draws nothing either, so the value has to be more than zeroes and dots:
   `r="0"` and `r="0.00"` are both a circle nobody can see. */
const SIZE = String.raw`\s*=\s*["']?(?![0.]+["'\s>])[^"'\s>]+`;
const DRAWN_BY = [
  new RegExp(String.raw`<path\b[^>]*\bd${SIZE}`, 'i'),
  new RegExp(String.raw`<circle\b[^>]*\br${SIZE}`, 'i'),
  new RegExp(String.raw`<ellipse\b[^>]*\brx${SIZE}`, 'i'),
  new RegExp(String.raw`<rect\b[^>]*\bwidth${SIZE}`, 'i'),
  new RegExp(String.raw`<(?:polygon|polyline)\b[^>]*\bpoints\s*=\s*["'][^"']+["']`, 'i'),
];

/**
 * A shape with an `id` and nothing in it.
 *
 * An empty `<clipPath>` is valid, resolves, and clips **everything**: whatever
 * it is applied to disappears. Every other guard here stays green while it
 * happens — the id exists, the reference finds it — and the page publishes a
 * hole where a photo was. The failure this watches for is a generator that
 * returns an empty string, which is exactly what src/lib/shapes.ts does with
 * parameters it cannot draw: it refuses rather than invent, and this is the
 * other half of that decision.
 */
export function checkEmptyClipShapes(markup: string, path = 'the page'): Violation[] {
  const clean = stripMarkupComments(markup);
  const violations: Violation[] = [];
  const pattern = /<clipPath\b([^>]*)>([\s\S]*?)<\/clipPath>/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(clean)) !== null) {
    const id = /(?<![-:\w])id\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(match[1] ?? '');
    const name = (id?.[1] ?? id?.[2] ?? id?.[3] ?? '').trim();
    const body = match[2] ?? '';

    /* A shape is drawn by a child element with a geometry, and every element
       here is asked for the attribute that gives it one: a path for its `d`, a
       circle for a non-zero `r`, a rect for its sides. The primitive arm used
       to accept the tag name alone, which let the export's own way of writing a
       shape define nothing at all — `<circle cx="0.5" cy="0.5"/>` has `r` = 0
       and clips everything away, exactly the failure this guard exists for. */
    const drawn = DRAWN_BY.some((pattern) => pattern.test(body));

    if (drawn) continue;

    violations.push({
      rule: 'shapes',
      detail: `${path}: \`<clipPath id="${name}">\` on line ${lineNumber(clean, match.index)} defines no geometry. An empty clip path is not ignored — it clips everything away, so whatever uses it is published as a hole, with the id resolving and every other check passing`,
    });
  }

  return violations;
}

/**
 * A geometry written by hand where it should be generated — rule 13.
 *
 * The rule's headline says the shapes are neither hand-written nor copied, and
 * until now only its corollary about empty clip paths had a guard: somebody
 * could paste a path out of a library into the component or into `CLIP_SHAPES`,
 * the shape would publish, every other check would stay green, and the
 * constraint the whole module exists for would be gone.
 *
 * Two forms are watched, because the paste can land in either place: a literal
 * `d="…"` in the component that emits the shapes, and a literal `path:` string
 * in the table. The one shape that legitimately carries its own geometry —
 * `clip-skewed`, which Material has no equivalent for — is named, so the
 * exception is declared in the guard rather than assumed by it.
 */
export function checkHandWrittenShapes(
  source: string,
  path = 'the source',
  allowed: readonly string[] = ['clip-skewed'],
): Violation[] {
  const clean = stripMarkupComments(source);
  const violations: Violation[] = [];

  const drawn = /\bd\s*=\s*"[^"]{4,}"/g;
  let match: RegExpExecArray | null;
  while ((match = drawn.exec(clean)) !== null) {
    violations.push({
      rule: 'rule 13',
      detail: `${path}: a geometry written out on line ${lineNumber(clean, match.index)}. The shapes are generated by src/lib/shapes.ts — a path pasted in here publishes fine and takes the constraint with it, silently`,
    });
  }

  /* A literal `path:` in the table. The value has to be a *string* to be a
     hand-written geometry: `path: scallopedPath({…})` is the generated form and
     the whole point.

     Each entry is cut at the next `id:` before being read, rather than letting
     a lazy quantifier run on: written the other way, the search from an entry
     whose path is generated walked past it and found the *next* entry's string
     — so the one declared exception made the entry above it look hand-written,
     which is the same misattribution the mutation scanner made in PR 4. */
  const ids = [...clean.matchAll(/id\s*:\s*['"`]([^'"`]+)['"`]/g)];

  for (const [at, entry] of ids.entries()) {
    const id = entry[1] ?? '';
    const from = entry.index;
    const to = ids[at + 1]?.index ?? clean.length;
    const written = /path\s*:\s*(['"`])([^'"`]*)\1/.exec(clean.slice(from, to));

    if (!written || allowed.includes(id)) continue;
    violations.push({
      rule: 'rule 13',
      detail: `${path}: \`${id}\` on line ${lineNumber(clean, from)} carries a written-out path instead of a generated one. Only ${allowed.join(', ')} may, and only because Material has no equivalent to generate`,
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
