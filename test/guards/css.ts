/* Guards over CSS.
 *
 * Every guard takes a string and returns the list of violations it found.
 * That signature is what makes the negative tests possible: a test hands in a
 * hand-written broken stylesheet and asserts the violation is reported. The
 * alternative — actually breaking the tokens and running a bad build — is not
 * repeatable in CI.
 *
 * The same functions run against both the source and the minified CSS in
 * dist/, which writes `--h-scena:100vh` with no space after the colon, so the
 * patterns below tolerate either spacing.
 */
import { type Violation, lineNumber } from './types.ts';

/* --- Parsing helpers ---------------------------------------------------- */

/** Blanks out comments, which would otherwise throw off brace matching. */
export function stripComments(css: string): string {
  // Newlines are preserved so reported line numbers stay accurate.
  return css.replace(/\/\*[\s\S]*?\*\//g, (comment) =>
    comment.replace(/[^\n]/g, ' '),
  );
}

export type SupportsBlock = {
  condition: string;
  body: string;
  index: number;
};

/**
 * Splits CSS into what sits inside an `@supports` block and what sits outside.
 *
 * The fallback guard needs this: "declared outside" and "raised inside" are
 * two different claims, and a double declaration in a single block — the shape
 * the minifier collapses — must not be able to pass for a valid fallback.
 */
export function splitSupports(css: string): {
  outside: string;
  blocks: SupportsBlock[];
} {
  const blocks: SupportsBlock[] = [];
  const lower = css.toLowerCase();
  let outside = '';
  let i = 0;

  while (i < css.length) {
    const start = lower.indexOf('@supports', i);
    if (start === -1) {
      outside += css.slice(i);
      break;
    }

    outside += css.slice(i, start);

    const open = css.indexOf('{', start);
    if (open === -1) {
      // An `@supports` with no body is malformed CSS and not this function's
      // problem. Treat it as ordinary text and move on.
      outside += css.slice(start);
      break;
    }

    let depth = 1;
    let j = open + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') depth--;
      j++;
    }

    blocks.push({
      condition: css.slice(start + '@supports'.length, open).trim(),
      body: css.slice(open + 1, depth === 0 ? j - 1 : css.length),
      index: start,
    });

    i = j;
  }

  return { outside, blocks };
}

/** Bodies of the innermost blocks: declarations live there and nowhere else. */
export function innermostBlocks(css: string): { body: string; index: number }[] {
  const blocks: { body: string; index: number }[] = [];
  const pattern = /\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(css)) !== null) {
    blocks.push({ body: match[1] ?? '', index: match.index });
  }
  return blocks;
}

/** Every value assigned to the custom property `name`. */
function valuesOf(css: string, name: string): string[] {
  const pattern = new RegExp(`--${name}\\s*:\\s*([^;}]+)`, 'g');
  const values: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(css)) !== null) {
    values.push((match[1] ?? '').trim());
  }
  return values;
}

const VH_ONLY = /^\d+(?:\.\d+)?vh$/;
const SVH_ONLY = /^\d+(?:\.\d+)?svh$/;

/* --- Rules 4 and 5: the scene-height fallback --------------------------- */

/**
 * The failure that already happened for real: the minifier collapses the
 * double declaration and `--h-scena: 100vh` vanishes from the published file
 * without the source changing. This guard reads the published file, which is
 * the only place the loss is visible.
 *
 * The token name is a parameter because the CSS tokens are still Italian and
 * are due to be renamed; when they are, only the default below moves.
 */
export function checkSceneHeightFallback(
  css: string,
  token = 'h-scena',
): Violation[] {
  const violations: Violation[] = [];
  const clean = stripComments(css);
  const { outside, blocks } = splitSupports(clean);

  const outsideValues = valuesOf(outside, token);

  if (!outsideValues.some((value) => VH_ONLY.test(value))) {
    violations.push({
      rule: 'rule 4',
      detail: `the \`vh\` fallback for \`--${token}\` is missing outside @supports: below Safari 15.4 the token has no value at all`,
    });
  }

  if (outsideValues.some((value) => SVH_ONLY.test(value))) {
    violations.push({
      rule: 'rule 4',
      detail: `\`--${token}\` is declared in \`svh\` outside @supports: that is the double declaration the minifier collapses, so the fallback never reaches production`,
    });
  }

  const raised = blocks.filter(
    (block) =>
      /height\s*:\s*100svh/i.test(block.condition) &&
      valuesOf(block.body, token).some((value) => SVH_ONLY.test(value)),
  );

  if (raised.length === 0) {
    violations.push({
      rule: 'rule 4',
      detail: `the \`@supports (height: 100svh)\` block that raises \`--${token}\` to \`100svh\` is missing`,
    });
  }

  // Rule 5: `dvh` must not appear anywhere. With dvh the viewport height
  // changes as Safari's address bar retracts and the snap positions jump.
  const dvh = /\d+(?:\.\d+)?dvh\b/g;
  let match: RegExpExecArray | null;
  while ((match = dvh.exec(clean)) !== null) {
    violations.push({
      rule: 'rule 5',
      detail: `\`${match[0]}\` on line ${lineNumber(clean, match.index)}: use \`svh\`, not \`dvh\``,
    });
  }

  return violations;
}

/* --- Rule 3, first half: no color-mix() and no oklch() ------------------ */

export function checkNoColorMixOrOklch(css: string): Violation[] {
  const violations: Violation[] = [];
  const clean = stripComments(css);

  for (const fn of ['color-mix', 'oklch']) {
    const pattern = new RegExp(`\\b${fn}\\s*\\(`, 'gi');
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(clean)) !== null) {
      violations.push({
        rule: 'rule 3',
        detail: `\`${fn}(\` on line ${lineNumber(clean, match.index)}: both were removed from the tokens to lower the browser floor`,
      });
    }
  }

  return violations;
}

/* --- Rule 3, second half: the --*-rgb triples --------------------------- */

/** Expands #abc to #aabbcc and returns the three channels. */
function channels(hex: string): [number, number, number] | null {
  const digits = hex.slice(1);
  const full =
    digits.length === 3 || digits.length === 4
      ? digits
          .slice(0, 3)
          .split('')
          .map((d) => d + d)
          .join('')
      : digits.slice(0, 6);
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

const LITERAL_TRIPLE = /^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/;

/**
 * Every colour used with transparency carries its own `--*-rgb` triple,
 * because there is no color-mix() to derive it. The two are the same fact
 * written twice: change the colour and forget the triple and nothing breaks —
 * it just drifts, which is the half nobody notices they have broken.
 *
 * Iteration goes **from the triples to the hex values**, never the other way:
 * a dozen colours (--blu-800, the --arancio-*, --nero, the --stato-*) have no
 * triple and are not supposed to have one.
 */
export function checkRgbTriples(css: string): Violation[] {
  const violations: Violation[] = [];
  const clean = stripComments(css);

  const bases = new Map<string, string>();
  const basePattern = /--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*(?=[;}])/gi;
  let base: RegExpExecArray | null;
  while ((base = basePattern.exec(clean)) !== null) {
    bases.set(base[1]!, base[2]!);
  }

  const triplePattern = /--([a-z0-9-]+)-rgb\s*:\s*([^;}]+)/g;
  let triple: RegExpExecArray | null;
  while ((triple = triplePattern.exec(clean)) !== null) {
    const name = triple[1]!;
    const value = (triple[2] ?? '').trim();

    // --accento-rgb holds `var(--ciclo-N-rgb)`: a pointer, not a triple. It
    // has to be skipped, otherwise parseInt yields NaN and the guard passes
    // for the wrong reason.
    const parts = LITERAL_TRIPLE.exec(value);
    if (!parts) continue;

    const hex = bases.get(name);
    if (!hex) {
      violations.push({
        rule: 'rule 3',
        detail: `the triple \`--${name}-rgb\` has no hex base colour \`--${name}\``,
      });
      continue;
    }

    const expected = channels(hex);
    if (!expected) {
      violations.push({
        rule: 'rule 3',
        detail: `\`--${name}: ${hex}\` is not a readable hex value`,
      });
      continue;
    }

    const declared: [number, number, number] = [
      Number(parts[1]),
      Number(parts[2]),
      Number(parts[3]),
    ];

    if (
      expected[0] !== declared[0] ||
      expected[1] !== declared[1] ||
      expected[2] !== declared[2]
    ) {
      violations.push({
        rule: 'rule 3',
        detail: `\`--${name}\` is ${hex}, i.e. ${expected.join(', ')}, but \`--${name}-rgb\` declares ${declared.join(', ')}`,
      });
    }
  }

  return violations;
}

/* --- Rule 4, at the source: no double declarations ---------------------- */

/**
 * Catches the shape the minifier collapses in the source, instead of
 * observing its absence in dist/. A fallback belongs in `@supports`: two
 * declarations of the same property in one block are not a fallback, they are
 * one declaration that disappears.
 */
export function checkDuplicateDeclarations(css: string): Violation[] {
  const violations: Violation[] = [];
  const clean = stripComments(css);

  for (const { body, index } of innermostBlocks(clean)) {
    const seen = new Map<string, number>();
    const pattern = /(^|[;{])\s*(--[a-z0-9-]+|[a-z-]+)\s*:/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(body)) !== null) {
      const property = match[2]!.toLowerCase();
      seen.set(property, (seen.get(property) ?? 0) + 1);
    }

    for (const [property, count] of seen) {
      if (count > 1) {
        violations.push({
          rule: 'rule 4',
          detail: `\`${property}\` is declared ${count} times in the block on line ${lineNumber(clean, index)}: the minifier keeps only the last one. Fallbacks go in @supports`,
        });
      }
    }
  }

  return violations;
}
