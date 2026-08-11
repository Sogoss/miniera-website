/* Rule 6: Archivo Black is declared as a weight *range* on purpose.
 *
 * @fontsource ships the family at a single weight, 400, because that is what
 * the family is. The tokens ask for 900 (--weight-black), and a browser that
 * finds no matching face synthesises the bold instead — thickening every title
 * away from the design, on every page, without any error anywhere. Declaring
 * `font-weight: 400 900` makes any weight in that span resolve to the real
 * glyphs.
 *
 * The declaration reads like a mistake, which is exactly why it needs a guard:
 * of all the rules in CLAUDE.md this is the one somebody will break while
 * believing they are tidying up.
 */
import { stripComments } from './css.ts';
import type { Violation } from './types.ts';

type FontFace = { family: string; weight: string | null };

/** The value of `property` in a declaration block, or null if absent. */
function declaration(body: string, property: string): string | null {
  const pattern = new RegExp(`(?:^|[;{])\\s*${property}\\s*:\\s*([^;}]+)`, 'i');
  const match = pattern.exec(body);
  return match ? (match[1] ?? '').trim() : null;
}

/** Quotes are optional and the minifier drops them, so compare without. */
function normaliseFamily(value: string): string {
  return value.replace(/["']/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function fontFaces(css: string): FontFace[] {
  const faces: FontFace[] = [];
  const pattern = /@font-face\s*\{([^{}]*)\}/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(css)) !== null) {
    const body = match[1] ?? '';
    const family = declaration(body, 'font-family');
    // A face with no family cannot be attributed to anything: not this
    // guard's business.
    if (family === null) continue;
    faces.push({ family, weight: declaration(body, 'font-weight') });
  }
  return faces;
}

const RANGE = /^(\d{1,4})\s+(\d{1,4})$/;

/**
 * `family` and `weight` are parameters rather than constants so the guard can
 * be pointed at any single-weight face used above its declared weight. The
 * defaults are the case rule 6 is written about.
 */
export function checkDisplayFontWeightRange(
  css: string,
  family = 'Archivo Black',
  weight = 900,
): Violation[] {
  const violations: Violation[] = [];
  const clean = stripComments(css);
  const wanted = normaliseFamily(family);
  const faces = fontFaces(clean).filter(
    (face) => normaliseFamily(face.family) === wanted,
  );

  if (faces.length === 0) {
    // Without this the guard would pass silently on a stylesheet that lost the
    // family altogether — the loudest possible version of the same defect.
    return [
      {
        rule: 'rule 6',
        detail: `no \`@font-face\` for \`${family}\`: the titles fall back to the next family in the stack`,
      },
    ];
  }

  for (const face of faces) {
    if (face.weight === null) {
      violations.push({
        rule: 'rule 6',
        detail: `the \`@font-face\` for \`${family}\` declares no \`font-weight\`: it defaults to 400, so weight ${weight} finds no face and the browser synthesises the bold`,
      });
      continue;
    }

    const range = RANGE.exec(face.weight);
    if (!range) {
      violations.push({
        rule: 'rule 6',
        detail: `\`font-weight: ${face.weight}\` on \`${family}\` is a single weight, not a range: weight ${weight} then has no matching face and the browser thickens the titles with a synthetic bold. The range is deliberate — see rule 6`,
      });
      continue;
    }

    const low = Number(range[1]);
    const high = Number(range[2]);
    if (weight < low || weight > high) {
      violations.push({
        rule: 'rule 6',
        detail: `\`font-weight: ${face.weight}\` on \`${family}\` does not cover weight ${weight}, which the tokens ask for: outside the range the browser synthesises the bold`,
      });
    }
  }

  return violations;
}
