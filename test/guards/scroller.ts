/* Guards over the scroller.
 *
 * The full-screen snap format is the client's requirement (rule 1), so what
 * these watch is not the format but the two ways it turns into something
 * unusable.
 *
 * The first is nesting. The export makes every scene a scrolling container
 * inside the scrolling programme, and docs/vincoli-tecnici.md says why that
 * cannot be copied: with two scrollers one inside the other, neither a keyboard
 * nor a screen reader can tell which one the arrow keys are talking to, and the
 * inner one swallows the gesture that was meant to move to the next evening.
 * Nothing fails when it happens — the page renders, and scrolling simply stops
 * doing what it looks like it should.
 */
import { innermostBlocks, stripComments } from './css.ts';
import { type Violation, lineNumber } from './types.ts';

/** `overflow: auto` and friends, in the forms that make a box scrollable. */
const SCROLLABLE = /(?:^|[;{])\s*overflow(-[xy])?\s*:\s*([^;}]+)/gi;

/**
 * Every rule that turns something into a scrolling container, with the selector
 * that does it.
 *
 * `hidden`, `clip` and `visible` are not scrolling: only `auto` and `scroll`
 * are, and `overlay` — deprecated, but still understood by some engines as a
 * scrolling box.
 */
export function scrollableRules(css: string): { selector: string; index: number }[] {
  const clean = stripComments(css);
  const found: { selector: string; index: number }[] = [];

  for (const { body, index } of innermostBlocks(clean)) {
    SCROLLABLE.lastIndex = 0;
    let declaration: RegExpExecArray | null;
    let scrolls = false;

    while ((declaration = SCROLLABLE.exec(body)) !== null) {
      if (/\b(auto|scroll|overlay)\b/i.test(declaration[2] ?? '')) scrolls = true;
    }
    if (!scrolls) continue;

    /* The selector is what comes between the previous block and this one — the
       whole prelude, so a rule listing three selectors is named by all three. */
    const before = clean.slice(0, index);
    const from = Math.max(before.lastIndexOf('}'), before.lastIndexOf('{')) + 1;
    found.push({ selector: clean.slice(from, index).trim().replace(/\s+/g, ' '), index });
  }

  return found;
}

/**
 * More than one scrolling container on a page that is a scroller.
 *
 * Written as a count rather than as a list of names on purpose: a guard keyed
 * on `.scene` stops watching the day somebody renames the class, and this
 * repository has been bitten by that shape of check before. What is true here
 * regardless of naming is that the programme is *one* scrolling box — anything
 * else on the page that scrolls is nested inside it.
 */
export function checkSingleScroller(css: string, path = 'the page'): Violation[] {
  const rules = scrollableRules(css);
  if (rules.length <= 1) return [];

  const clean = stripComments(css);
  return rules.slice(1).map((rule) => ({
    rule: 'scroller',
    detail: `${path}: \`${rule.selector}\` on line ${lineNumber(clean, rule.index)} is a second scrolling container on a page whose programme is already one. Nested scrollers make it ambiguous which box the arrow keys move — the export does this to every scene, and docs/vincoli-tecnici.md is where it was decided not to. Clip the overflow instead, or let the type shrink`,
  }));
}
