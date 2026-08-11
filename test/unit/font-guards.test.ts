/* Negative tests for the rule 6 guard.
 *
 * The violation that matters is the first one below: somebody reads
 * `font-weight: 400 900` on a family that only has one weight, decides it is a
 * mistake, and writes `font-weight: 400`. Nothing breaks — the titles just
 * quietly get a synthetic bold on every page.
 */
import { describe, expect, it } from 'vitest';
import { checkDisplayFontWeightRange } from '../guards/fonts.ts';

const GOOD = `
@font-face {
  font-family: 'Archivo Black';
  font-weight: 400 900;
  src: url('/a.woff2') format('woff2');
}
`;

describe('checkDisplayFontWeightRange', () => {
  it('accepts the range the tokens rely on', () => {
    expect(checkDisplayFontWeightRange(GOOD)).toEqual([]);
  });

  it('reports the single weight somebody will "fix" it to', () => {
    const tidied = GOOD.replace('font-weight: 400 900', 'font-weight: 400');
    const violations = checkDisplayFontWeightRange(tidied);
    expect(violations).toHaveLength(1);
    expect(violations[0]!.rule).toBe('rule 6');
    expect(violations[0]!.detail).toContain('synthetic bold');
  });

  it('reports a single weight even when it is the requested one', () => {
    // `font-weight: 900` would satisfy the titles and break every other use of
    // the family. Rule 6 asks for a range, not for a luckier single value.
    const single = GOOD.replace('font-weight: 400 900', 'font-weight: 900');
    expect(checkDisplayFontWeightRange(single)).toHaveLength(1);
  });

  it('reports a range that stops short of the weight the tokens ask for', () => {
    const short = GOOD.replace('font-weight: 400 900', 'font-weight: 400 700');
    const violations = checkDisplayFontWeightRange(short);
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('does not cover weight 900');
  });

  it('reports a face with no font-weight at all', () => {
    const missing = GOOD.replace('  font-weight: 400 900;\n', '');
    const violations = checkDisplayFontWeightRange(missing);
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('declares no `font-weight`');
  });

  it('reports the family disappearing altogether', () => {
    const violations = checkDisplayFontWeightRange(':root { --a: #fff; }');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('no `@font-face`');
  });

  it('accepts a wider range', () => {
    expect(
      checkDisplayFontWeightRange(GOOD.replace('400 900', '100 900')),
    ).toEqual([]);
  });

  it('checks every face of the family, not just the first', () => {
    // The repository declares two, one per unicode-range. A tidy-up would very
    // likely touch one and leave the other.
    const half = GOOD + GOOD.replace('font-weight: 400 900', 'font-weight: 400');
    expect(checkDisplayFontWeightRange(half)).toHaveLength(1);
  });

  it('leaves the other families alone', () => {
    // IBM Plex Mono is genuinely a multi-weight family with real files at 400
    // and 600: single values there are correct and must not be reported.
    const others = `
      ${GOOD}
      @font-face { font-family: 'IBM Plex Mono'; font-weight: 400; src: url('/m.woff2'); }
      @font-face { font-family: 'IBM Plex Mono'; font-weight: 600; src: url('/m6.woff2'); }
    `;
    expect(checkDisplayFontWeightRange(others)).toEqual([]);
  });

  it('reads the minified form, unquoted and without spaces', () => {
    const minified =
      "@font-face{font-family:Archivo Black;font-weight:400 900;src:url(/a.woff2) format('woff2')}";
    expect(checkDisplayFontWeightRange(minified)).toEqual([]);
  });

  it('is not fooled by the family name appearing in a comment', () => {
    const commented = `/* Archivo Black: font-weight: 400 900 */\n:root { --a: #fff; }`;
    expect(checkDisplayFontWeightRange(commented)).toHaveLength(1);
  });

  it('points at another family and weight when asked', () => {
    const other = "@font-face{font-family:'Marchio';font-weight:300 800;src:url(/x.woff2)}";
    expect(checkDisplayFontWeightRange(other, 'Marchio', 800)).toEqual([]);
    expect(checkDisplayFontWeightRange(other, 'Marchio', 900)).toHaveLength(1);
  });
});
