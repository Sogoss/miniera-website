/* Negative tests for the guard over nested scrollers.
 *
 * The defect renders perfectly: two scrolling boxes one inside the other, and
 * scrolling simply stops doing what it looks like it should — the inner one
 * swallows the gesture meant to reach the next evening, and a keyboard cannot
 * tell which of the two it is driving.
 */
import { describe, expect, it } from 'vitest';
import {
  checkSingleScroller,
  checkSmoothScrollArgument,
  scrollableRules,
} from '../guards/scroller.ts';

const SCROLLER = '.scroller { height: var(--scene-height); overflow-y: auto; scroll-snap-type: y mandatory; }';

describe('checkSingleScroller', () => {
  it('accepts a page with one scrolling container', () => {
    expect(checkSingleScroller(SCROLLER, 'dist/index.html')).toEqual([]);
  });

  it('reports the scene the export makes scrollable', () => {
    // What copying the export gives you: `overflow-y: auto` on every scene,
    // inside the scroller that already scrolls.
    const nested = `${SCROLLER}\n.scene { height: var(--scene-height); overflow-y: auto; }`;
    const violations = checkSingleScroller(nested, 'dist/index.html');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('.scene');
    expect(violations[0]!.detail).toContain('dist/index.html');
  });

  it('does not count clipping as scrolling', () => {
    // `overflow: hidden` is how the description gives way on a short screen,
    // and it is the fix this guard exists to push people towards — firing on it
    // would be firing on the remedy.
    const clipped = `${SCROLLER}\n.scene-description { overflow: hidden; -webkit-line-clamp: 3; }`;
    expect(checkSingleScroller(clipped)).toEqual([]);
    expect(checkSingleScroller(`${SCROLLER}\n.frame { overflow: clip; }`)).toEqual([]);
  });

  it('reads the shorthand and both axes', () => {
    expect(scrollableRules('.a { overflow: auto; }')).toHaveLength(1);
    expect(scrollableRules('.b { overflow-x: scroll; }')).toHaveLength(1);
    expect(scrollableRules('.c { overflow-y: overlay; }')).toHaveLength(1);
    expect(scrollableRules('.d { overflow: hidden auto; }')).toHaveLength(1);
  });

  it('names every selector of a rule that lists several', () => {
    const shared = `${SCROLLER}\n.scene, .other { overflow: auto; }`;
    expect(checkSingleScroller(shared)[0]!.detail).toContain('.scene, .other');
  });

  it('lets a dialog have its own scrolling panel', () => {
    // The one place a second scrolling box is not nested inside the first:
    // while a modal is open the rest of the page is inert. The exception has to
    // be written into the selector, because a guard reading CSS cannot see from
    // `.modal-panel` alone that the element sits inside a dialog.
    const withModal = `${SCROLLER}\ndialog.modal .modal-panel { max-height: 80vh; overflow-y: auto; }`;
    expect(checkSingleScroller(withModal)).toEqual([]);

    const unwritten = `${SCROLLER}\n.modal-panel { max-height: 80vh; overflow-y: auto; }`;
    expect(checkSingleScroller(unwritten)).toHaveLength(1);
  });

  it('lets the Timeline bar scroll sideways, and only sideways', () => {
    // The second exception, and it costs two conditions. The bar on a phone is
    // fixed, sits outside the programme and moves along the axis the programme
    // does not use, so it takes no gesture the scroller wanted. Written into
    // the selector like the dialog's, because the CSS does not show that a box
    // is a horizontal bar.
    const bar = `${SCROLLER}\n.timeline[data-timeline] { overflow-x: auto; overflow-y: hidden; }`;
    expect(checkSingleScroller(bar)).toEqual([]);

    // And checked on the axis rather than believed on the name: the same
    // attribute over a vertical scroll is a second scroller wearing the right
    // label, which is the thing this guard is for.
    const vertical = `${SCROLLER}\n.timeline[data-timeline] { overflow-y: auto; }`;
    expect(checkSingleScroller(vertical)).toHaveLength(1);

    // The shorthand says the same thing, and the y value is the second one.
    expect(
      checkSingleScroller(`${SCROLLER}\n[data-timeline] { overflow: auto hidden; }`),
    ).toEqual([]);
    expect(
      checkSingleScroller(`${SCROLLER}\n[data-timeline] { overflow: hidden auto; }`),
    ).toHaveLength(1);
    // One value is both axes, so it is vertical too.
    expect(checkSingleScroller(`${SCROLLER}\n[data-timeline] { overflow: auto; }`)).toHaveLength(1);
  });

  it('reads which axis an ordinary rule scrolls', () => {
    expect(scrollableRules('.a { overflow-x: auto; }')[0]!.vertically).toBe(false);
    expect(scrollableRules('.b { overflow-y: scroll; }')[0]!.vertically).toBe(true);
    expect(scrollableRules('.c { overflow: auto; }')[0]!.vertically).toBe(true);
    expect(scrollableRules('.d { overflow: hidden auto; }')[0]!.vertically).toBe(true);
    expect(scrollableRules('.e { overflow: auto hidden; }')[0]!.vertically).toBe(false);
  });

  it('ignores what is only in a comment', () => {
    expect(checkSingleScroller(`${SCROLLER}\n/* .scene { overflow: auto; } */`)).toEqual([]);
  });

  it('says nothing about a page that scrolls nowhere', () => {
    expect(checkSingleScroller('.card { padding: 1rem; }')).toEqual([]);
  });
});

/* Negative tests for the guard over smooth scrolling asked for in JavaScript.
 *
 * The defect is invisible everywhere it could be looked for: the source reads
 * correctly, dist/ carries no trace of it, the page behaves perfectly — unless
 * the reader has asked their system for less movement, in which case they get
 * the whole snap-scrolling animation and the one control they have does
 * nothing.
 */
describe('checkSmoothScrollArgument', () => {
  it('reports a scroll that asks for smooth by argument', () => {
    const source = `scenes[index].scrollIntoView({ behavior: 'smooth' });`;
    const violations = checkSmoothScrollArgument(source, 'src/pages/index.astro');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('src/pages/index.astro');
    expect(violations[0]!.detail).toContain('prefers-reduced-motion');
  });

  it('reads all three ways a string can be written', () => {
    expect(checkSmoothScrollArgument(`el.scrollTo({behavior:"smooth"})`, 'a.ts')).toHaveLength(1);
    expect(checkSmoothScrollArgument('el.scrollTo({behavior:`smooth`})', 'a.ts')).toHaveLength(1);
    expect(checkSmoothScrollArgument(`el.scrollBy({ behavior : 'smooth' })`, 'a.ts')).toHaveLength(1);
  });

  it('reads a key that carries quotes of its own', () => {
    // The one form somebody reaches for to get past a linter, and the one form
    // this guard used to miss twice over: the pattern wanted the colon straight
    // after the word, and the masking blanks what is inside quotes — so a
    // quoted key was read as prose about the rule instead of the rule broken.
    expect(checkSmoothScrollArgument(`el.scrollTo({ "behavior": "smooth" })`, 'a.ts')).toHaveLength(
      1,
    );
    expect(checkSmoothScrollArgument(`el.scrollTo({'behavior':'smooth'})`, 'a.ts')).toHaveLength(1);
  });

  it('leaves the stylesheet alone', () => {
    // The property is the fix this guard pushes towards, and it travels through
    // the same files: a component's <style> block sits in the .astro this reads.
    const css = `.scroller[data-smooth] { scroll-behavior: smooth; }`;
    expect(checkSmoothScrollArgument(css, 'src/pages/index.astro')).toEqual([]);
  });

  it('allows a jump that forces itself to stay a jump', () => {
    // The mirror image, and not the same thing: forcing motion off can never be
    // what a reader asking for less motion is complaining about.
    expect(checkSmoothScrollArgument(`el.scrollTo({ behavior: 'instant' })`, 'a.ts')).toEqual([]);
  });

  it('ignores the rule written about rather than broken', () => {
    const commented = `// never write behavior: 'smooth' here\nel.scrollIntoView();`;
    expect(checkSmoothScrollArgument(commented, 'a.ts')).toEqual([]);

    const block = `/* behavior: 'smooth' beats the stylesheet */\nel.scrollIntoView();`;
    expect(checkSmoothScrollArgument(block, 'a.ts')).toEqual([]);

    const prose = `const why = "behavior: 'smooth' cannot be overridden";`;
    expect(checkSmoothScrollArgument(prose, 'a.ts')).toEqual([]);
  });

  it('says nothing about a file that scrolls nothing', () => {
    expect(checkSmoothScrollArgument(`const a = 1;`, 'a.ts')).toEqual([]);
  });
});
