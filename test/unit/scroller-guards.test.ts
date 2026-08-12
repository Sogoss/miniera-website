/* Negative tests for the guard over nested scrollers.
 *
 * The defect renders perfectly: two scrolling boxes one inside the other, and
 * scrolling simply stops doing what it looks like it should — the inner one
 * swallows the gesture meant to reach the next evening, and a keyboard cannot
 * tell which of the two it is driving.
 */
import { describe, expect, it } from 'vitest';
import { checkSingleScroller, scrollableRules } from '../guards/scroller.ts';

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

  it('ignores what is only in a comment', () => {
    expect(checkSingleScroller(`${SCROLLER}\n/* .scene { overflow: auto; } */`)).toEqual([]);
  });

  it('says nothing about a page that scrolls nowhere', () => {
    expect(checkSingleScroller('.card { padding: 1rem; }')).toEqual([]);
  });
});
