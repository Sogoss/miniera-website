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
import { stripMarkupComments } from './language.ts';
import { type Violation, lineNumber } from './types.ts';

/** Every `selector { … }` in a chunk of CSS, innermost first, with the offset
 *  of the first character of the selector rather than of the whitespace before
 *  it — which is what a reported line number has to point at. */
function cssRules(css: string): { selector: string; body: string; index: number }[] {
  const found: { selector: string; body: string; index: number }[] = [];
  const pattern = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(css)) !== null) {
    const selector = match[1] ?? '';
    found.push({
      selector,
      body: match[2] ?? '',
      index: match.index + (selector.length - selector.trimStart().length),
    });
  }
  return found;
}

/* `[data-cycle]` and `[data-cycle="2"]`, and deliberately not `[data-cycle-x]`:
   an attribute whose name merely starts the same way is a different attribute,
   and a guard that reports it is one somebody switches off. */
const CYCLE_SELECTOR = /\[\s*data-cycle\s*(?:[~^|$*]?=[^\]]*)?\]/i;
const DECLARES_ACCENT = /--accent(?:-rgb)?\s*:/i;

/* --- Rule 12, first half: no hand-written rules -------------------------- */

/**
 * A hand-written rule that gives a cycle its accent.
 *
 * Both halves of that sentence do work. Reporting every `[data-cycle…]`
 * selector regardless of what it declares forbids far more than rule 12 says:
 * the scroller of PR 7 will legitimately write `[data-cycle] { scroll-snap-align:
 * start }`, which declares no accent and cannot shadow an emitted rule, and a
 * guard that turns that PR red with a message about the order of the
 * stylesheets is a guard that gets loosened — taking the real check with it.
 * The sibling guard below already reasons this way, and the two now agree.
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

  for (const rule of cssRules(clean)) {
    if (!CYCLE_SELECTOR.test(rule.selector) || !DECLARES_ACCENT.test(rule.body)) continue;
    violations.push({
      rule: 'rule 12',
      detail: `${path} line ${lineNumber(clean, rule.index)}: a \`[data-cycle…]\` rule declaring an accent by hand. The accent of a cycle comes from its file in src/content/cicli/ and is emitted at build time; a copy here has the same specificity as the emitted rule, so which of the two wins is decided by the order of the stylesheets — and the day that order changes the old colour comes back with nothing failing`,
    });
  }

  return violations;
}

/* --- Rule 12, second half: the rules travel with the attribute ----------- */

/* --- The accent has to be readable on the ground it sits on -------------- */

/** Relative luminance, as WCAG defines it. */
function luminance(hex: string): number | null {
  const digits = /^#([0-9a-fA-F]{6})$/.exec(hex.trim())?.[1];
  if (!digits) return null;

  const channels = [0, 2, 4]
    .map((at) => parseInt(digits.slice(at, at + 2), 16) / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));

  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

/** The WCAG contrast ratio between two colours, or null if either is unreadable. */
export function contrastRatio(one: string, other: string): number | null {
  const a = luminance(one);
  const b = luminance(other);
  if (a === null || b === null) return null;
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/* 3:1, the WCAG floor for large text and for interface elements — which is what
   the accent is: the kicker, the border of a scene, the tick of the Timeline.
   The five tuned colours of the design sit between 3.88 and 5.55 and the sixth
   at 4.81, so this is not a bar the palette has to stretch for; it is the line
   below which a colour is not a design decision but an unreadable page. */
const MINIMUM_CONTRAST = 3;

/* 4.5:1, which is what a word needs rather than a line.
   Since PR 13 the accent is not only drawn but written *on*: the current voice
   of the navigation is a label in `--text-on-accent` — black — on a background
   of the cycle's colour, and «Chi siamo» read at 3:1 is a heading nobody with
   ordinary eyesight in a lit room can be asked to read. It is the same
   discovery as PR 6, where the 3:1 was checked against the page ground while
   `EventCard` drew the accent on `--surface-raised`: the guard was right about
   a pairing that had stopped being the only one. */
const MINIMUM_TEXT_CONTRAST = 4.5;

/**
 * A cycle colour that cannot be read against something it is drawn against.
 *
 * Until PR 4 an accent could only ever be one of the five tokens in colors.css,
 * tuned to equal lightness and saturation so that no cycle prevails and the
 * contrast holds. Now the colour comes from a content file an editor fills in,
 * and the only thing between the CMS and the published page is a six-digit-hex
 * syntax check: `#0a3550` is a valid hex and is nearly the blue ground itself.
 * Nothing else in the suite would say a word, and the failure is visible only by
 * looking at the deployed site.
 *
 * `minimum` is which of the two questions is being asked. Against a surface the
 * accent is an interface element — a kicker, a border, a tick — and 3:1 is the
 * floor. Against the ink written *on* it, it is a background for words, and the
 * floor is 4.5:1. Two calls and one function, because a colour that fails
 * either one fails for the same reason and the fix is the same: pick another.
 *
 * This does not check the rest of the tuning — that no cycle *prevails* is a
 * judgement about saturation next to five other colours, and a guard that tried
 * would be arguing with a designer. It checks the half that is a number.
 */
export function checkAccentContrast(
  cycle: { number: number; name: string; color: string },
  against: string,
  path = 'the cycle',
  minimum: number = MINIMUM_CONTRAST,
): Violation[] {
  const ratio = contrastRatio(cycle.color, against);
  if (ratio === null) {
    return [
      {
        rule: 'rule 12',
        detail: `${path}: the colour \`${cycle.color}\` or the ground \`${against}\` is not a six-digit hex, so no contrast can be worked out for cycle #${cycle.number} «${cycle.name}»`,
      },
    ];
  }

  if (ratio >= minimum) return [];

  /* The threshold asked for and not the one this branch was written around: a
     third caller passing 4 would otherwise be told a colour at 3.5:1 is «below
     the 3:1», which names a floor the colour clears. */
  const because =
    minimum >= MINIMUM_TEXT_CONTRAST
      ? `below the ${minimum}:1 a word needs: the current voice of the navigation is a label written on this colour, and the booking link in the modal is another`
      : `below the ${minimum}:1 an accent needs to be read at all. The five tuned colours of the design are between 3.88 and 5.55; a colour this close to the ground publishes a kicker and a scene border nobody can see`;

  return [
    {
      rule: 'rule 12',
      detail: `${path}: cycle #${cycle.number} «${cycle.name}» has the colour \`${cycle.color}\`, which sits at ${ratio.toFixed(2)}:1 against \`${against}\` — ${because}`,
    },
  ];
}

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
  for (const rule of cssRules(css)) {
    if (!/--accent\s*:/.test(rule.body)) continue;
    for (const value of selectorValues(rule.selector)) found.add(value);
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
 * stylesheets it links plus its own `<style>` blocks.
 *
 * Markup comments are blanked first. Astro copies them into dist/ untouched, so
 * a scene left commented out in a draft — `<!-- <article data-cycle="9"> -->` —
 * would otherwise be read as a cycle in use and fail the build over a page that
 * renders perfectly, naming a component that is in fact there. The guard on the
 * Italian `data-*` names blanks them for exactly this reason.
 */
export function checkCycleRulesResolve(
  markup: string,
  css: string,
  path = 'the page',
): Violation[] {
  const used = attributeValues(stripMarkupComments(markup));
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
