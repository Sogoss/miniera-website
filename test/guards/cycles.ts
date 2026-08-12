/* Guards over the accent of the cycles.
 *
 * The `[data-cycle="N"] { --accent; --accent-rgb }` rules are emitted at build
 * time from src/content/cicli/ — src/lib/cycles.ts — and there are two ways
 * that arrangement quietly stops being true. Neither fails a build, neither is
 * visible in a diff, and both publish a page that renders perfectly in the
 * wrong colour, which is the shape of defect this repository built an apparatus
 * for.
 *
 * 1. Someone writes a `[data-cycle]` rule by hand again. It has the same
 *    specificity as the emitted one, so which wins is decided by the order of
 *    the stylesheets — right today, wrong the day an import moves.
 * 2. A page carries `data-cycle` attributes without carrying the rules. Every
 *    evening then falls back to the brand orange of `:root`.
 *
 * The two read opposite layers on purpose. The first is a **source** guard: in
 * dist/ the emitted rules are there by design and it would report every one of
 * them. The second is a **build** guard: in the source `data-cycle={n}` is an
 * expression, and only the published HTML says what it came out as.
 */
import { stripComments } from './css.ts';
import { type Violation, lineNumber } from './types.ts';

/* --- Rule 12, first half: no hand-written rules -------------------------- */

/**
 * A `[data-cycle…]` selector in a stylesheet or in a component's `<style>`.
 *
 * Source only — see the note at the top of this file. Comments are blanked
 * first, so the paragraph in colors.css explaining where the rules come from
 * can go on naming them.
 */
export function checkHandWrittenCycleRules(
  css: string,
  path = 'the stylesheet',
): Violation[] {
  const violations: Violation[] = [];
  const clean = stripComments(css);

  const pattern = /\[\s*data-cycle\b/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(clean)) !== null) {
    violations.push({
      rule: 'rule 12',
      detail: `${path} line ${lineNumber(clean, match.index)}: a \`[data-cycle…]\` rule written by hand. The accent of a cycle comes from its file in src/content/cicli/ and is emitted at build time; a copy here has the same specificity as the emitted rule, so which of the two wins is decided by the order of the stylesheets — and the day that order changes the old colour comes back with nothing failing`,
    });
  }

  return violations;
}

/* --- Rule 12, second half: the rules travel with the attribute ----------- */

/** Every value a `data-cycle` attribute carries in the published markup. */
function attributeValues(markup: string): Map<string, number> {
  const found = new Map<string, number>();
  const pattern = /\sdata-cycle\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(markup)) !== null) {
    const value = (match[1] ?? match[2] ?? match[3] ?? '').trim();
    if (value && !found.has(value)) found.set(value, match.index);
  }
  return found;
}

/**
 * Every value a `[data-cycle="…"]` selector names, in one chunk of selector.
 *
 * A bare `[data-cycle]` does not count: it dresses every cycle the same way,
 * which is not an answer to «is there a rule for this one».
 */
function selectorValues(selector: string): string[] {
  const found: string[] = [];
  const pattern = /\[\s*data-cycle\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\]\s]+))\s*\]/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(selector)) !== null) {
    found.push((match[1] ?? match[2] ?? match[3] ?? '').trim());
  }
  return found;
}

/**
 * The cycles the CSS actually gives an accent to.
 *
 * Not merely the ones a selector names: the question this guard asks is
 * «does --accent resolve under this attribute», and a rule that matches the
 * cycle while declaring something else — a border, a display — answers no. Left
 * counting selectors, the guard would go green on a page whose only mention of
 * cycle 6 was styling something unrelated.
 */
function accentedValues(css: string): Set<string> {
  const found = new Set<string>();
  const rules = /([^{}]+)\{([^{}]*)\}/g;
  let rule: RegExpExecArray | null;
  while ((rule = rules.exec(css)) !== null) {
    if (!/--accent\s*:/.test(rule[2] ?? '')) continue;
    for (const value of selectorValues(rule[1] ?? '')) found.add(value);
  }
  return found;
}

/**
 * A published page that declares a cycle it has no rule for.
 *
 * This is the promise the layout of PR 5 and the pages of PR 7 and PR 9 have to
 * keep by carrying `CycleAccents`: forget it and every evening keeps the
 * `:root` orange, which looks like a design decision rather than a missing
 * component. The CSS handed in is the CSS that page actually receives — the
 * stylesheets of dist/ plus its own `<style>` blocks.
 */
export function checkCycleRulesResolve(
  markup: string,
  css: string,
  path = 'the page',
): Violation[] {
  const used = attributeValues(markup);
  if (used.size === 0) return [];

  const declared = accentedValues(stripComments(css));
  const violations: Violation[] = [];

  for (const [value, index] of used) {
    if (declared.has(value)) continue;
    violations.push({
      rule: 'rule 12',
      detail: `${path} line ${lineNumber(markup, index)}: \`data-cycle="${value}"\` with no \`[data-cycle="${value}"]\` rule in the CSS this page receives. Every --accent underneath it falls back to the brand orange of :root — a page that renders perfectly in the wrong colour. Either the cycle is missing from src/content/cicli/ or the page is not carrying the CycleAccents component`,
    });
  }

  return violations;
}
