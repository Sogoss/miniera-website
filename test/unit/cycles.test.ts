/* The pure half of the cycles: the colour of a file becoming a CSS rule.
 *
 * Nothing here needs a build. The module imports nothing, so these run on the
 * plain functions — which is what makes the cases that never occur in the
 * repository testable: a colour that is not a hex, a number that is not whole,
 * two cycles claiming the same number.
 */
import { describe, expect, it } from 'vitest';
import {
  type CycleLike,
  cycleAccentCss,
  findCycleNumberConflicts,
  rgbTriple,
} from '../../src/lib/cycles.ts';
import { checkNoColorMixOrOklch, checkRgbTriples } from '../guards/css.ts';

const cycle = (
  number: number,
  color: string,
  id = `${number}-ciclo`,
  name = `Ciclo ${number}`,
): CycleLike => ({ id, number, name, color });

describe('rgbTriple', () => {
  it('converts the palette of the design', () => {
    expect(rgbTriple('#f26419')).toBe('242, 100, 25');
    expect(rgbTriple('#cb9e00')).toBe('203, 158, 0');
    expect(rgbTriple('#3baa73')).toBe('59, 170, 115');
  });

  it('keeps a channel that is zero', () => {
    // The half a naive parser gets wrong: `parseInt('00', 16)` is 0, which is
    // falsy, and any `|| default` on the way out turns a teal into whatever the
    // default was. The sixth cycle in the repository is exactly this shape.
    expect(rgbTriple('#00a9b0')).toBe('0, 169, 176');
    expect(rgbTriple('#000000')).toBe('0, 0, 0');
    expect(rgbTriple('#ff00ff')).toBe('255, 0, 255');
  });

  it('reads both cases of the hex digits', () => {
    expect(rgbTriple('#CB9E00')).toBe('203, 158, 0');
    expect(rgbTriple('#Ff00Ff')).toBe('255, 0, 255');
  });

  it('returns null for anything that is not a six-digit hex', () => {
    // Three-digit hexes, named colours and functions are all legitimate CSS and
    // all refused: what leaves here is written into a <style> as it stands.
    expect(rgbTriple('#fff')).toBeNull();
    expect(rgbTriple('red')).toBeNull();
    expect(rgbTriple('rgb(0, 169, 176)')).toBeNull();
    expect(rgbTriple('#00a9b')).toBeNull();
    expect(rgbTriple('#00a9b0ff')).toBeNull();
    expect(rgbTriple('')).toBeNull();
  });
});

describe('cycleAccentCss', () => {
  const cycles = [cycle(3, '#3baa73'), cycle(6, '#00a9b0'), cycle(2, '#cb9e00')];

  it('emits one rule per cycle, in the order of the numbers', () => {
    // The order of the collection is the order of the file names, and it must
    // not decide the order of the published CSS: adding a cycle would then
    // reshuffle the whole block and every build diff would be about nothing.
    const lines = cycleAccentCss(cycles).split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('[data-cycle="2"]');
    expect(lines[1]).toContain('[data-cycle="3"]');
    expect(lines[2]).toContain('[data-cycle="6"]');
  });

  it('gives each cycle its own colour and its triple', () => {
    expect(cycleAccentCss([cycle(6, '#00a9b0')])).toBe(
      '[data-cycle="6"] { --accent: #00a9b0; --accent-rgb: 0, 169, 176; }',
    );
  });

  it('is not limited to the five colours of the design', () => {
    // Nothing in the emitted CSS refers to --cycle-N any more: a cycle numbered
    // beyond the fifth is not a special case, it is the same case.
    const beyond = cycleAccentCss([cycle(9, '#123456')]);
    expect(beyond).toContain('[data-cycle="9"]');
    expect(beyond).toContain('--accent: #123456');
    expect(beyond).not.toContain('var(--cycle-');
  });

  it('normalises the hex to lower case', () => {
    expect(cycleAccentCss([cycle(2, '#CB9E00')])).toContain('--accent: #cb9e00');
  });

  it('produces CSS the guards of PR 1 accept', () => {
    // The point of writing the triple next to the hex instead of pointing at
    // --cycle-N-rgb: checkRgbTriples can compare the two, and a conversion that
    // drifts turns dist/ red without a new guard having to be written.
    const css = cycleAccentCss(cycles);
    expect(checkRgbTriples(css)).toEqual([]);
    expect(checkNoColorMixOrOklch(css)).toEqual([]);
  });

  it('is seen to fail when the conversion drifts', () => {
    // Without this the assertion above would be a guard nobody has watched
    // fire, over CSS that happens to be right.
    const drifted = '[data-cycle="6"] { --accent: #00a9b0; --accent-rgb: 0, 169, 177; }';
    expect(checkRgbTriples(drifted).length).toBeGreaterThan(0);
  });

  it('has nothing to say about an empty collection', () => {
    expect(cycleAccentCss([])).toBe('');
  });

  it('refuses a colour it does not recognise, naming the cycle', () => {
    expect(() => cycleAccentCss([cycle(2, 'red')])).toThrow(/«Ciclo 2»/);
    expect(() => cycleAccentCss([cycle(2, '#fff')])).toThrow(/six-digit hex/);
  });

  it('refuses anything that would escape the <style> it is written into', () => {
    // set:html escapes nothing, so this is the one thing standing between a
    // content file and arbitrary markup in the head of every page. The schema
    // refuses it upstream too — schemas get widened, this does not.
    expect(() =>
      cycleAccentCss([cycle(2, '#000000; } body { display: none; } .x {')]),
    ).toThrow();
    expect(() => cycleAccentCss([cycle(2, '#000000</style><script>alert(1)</script>')])).toThrow();
  });

  it('refuses a number that is not whole', () => {
    // It becomes both a selector and an attribute; `[data-cycle="1.5"]` would
    // match nothing and say nothing.
    expect(() => cycleAccentCss([cycle(1.5, '#f26419')])).toThrow(/whole number/);
  });
});

describe('findCycleNumberConflicts', () => {
  it('has nothing to say about cycles that agree', () => {
    expect(findCycleNumberConflicts([cycle(2, '#cb9e00'), cycle(3, '#3baa73')])).toEqual([]);
  });

  it('names both cycles that claim one number', () => {
    // Both, not just the second: which of the two is wrong is the editor's
    // call, and the one the loader happened to hand over first is not an
    // answer. It is the same reasoning as the twin evenings in events.ts.
    const problems = findCycleNumberConflicts([
      cycle(3, '#3baa73', '3-terra-di-nessuno', 'Terra di nessuno'),
      cycle(3, '#00a9b0', '3-turni', 'Turni'),
    ]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('Terra di nessuno');
    expect(problems[0]).toContain('Turni');
    expect(problems[0]).toContain('3');
  });

  it('says the same thing whichever order the files were read in', () => {
    const one = cycle(3, '#3baa73', '3-terra-di-nessuno', 'Terra di nessuno');
    const other = cycle(3, '#00a9b0', '3-turni', 'Turni');
    expect(findCycleNumberConflicts([one, other])).toEqual(findCycleNumberConflicts([other, one]));
  });

  it('reports every twin of a number claimed three times', () => {
    const problems = findCycleNumberConflicts([
      cycle(4, '#e05a81', '4-a'),
      cycle(4, '#ac70c6', '4-b'),
      cycle(4, '#00a9b0', '4-c'),
    ]);
    expect(problems).toHaveLength(2);
  });
});
