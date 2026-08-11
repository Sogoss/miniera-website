/* Negative tests for the language guards.
 *
 * Both of these exist because of the rename in PR 2, and both are written to
 * be quiet about anything that is not the defect they are named after: a guard
 * that fires on correct input gets switched off, and takes the rest of the
 * suite's credibility with it. Half the cases below are there to prove they
 * stay quiet.
 */
import { describe, expect, it } from 'vitest';
import {
  checkItalianCustomProperties,
  checkMissingAccents,
} from '../guards/language.ts';

describe('checkItalianCustomProperties', () => {
  it('passes on the renamed tokens', () => {
    const css = ':root { --accent: var(--cycle-3); --scene-height: 100vh; }';
    expect(checkItalianCustomProperties(css)).toEqual([]);
  });

  it('reports a declaration left in Italian', () => {
    const violations = checkItalianCustomProperties(':root { --accento: #f26419; }');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.rule).toBe('language');
    expect(violations[0]!.detail).toContain('accento');
  });

  it('reports a reading left in Italian', () => {
    // The half that actually breaks: the declaration moved, the var() did not.
    const violations = checkItalianCustomProperties('.tick { color: var(--accento); }');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('the reading of');
  });

  it('reports a data attribute left in Italian', () => {
    const violations = checkItalianCustomProperties('[data-ciclo="2"] { --accent: #cb9e00; }');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('data-');
  });

  it('compares whole segments, not substrings', () => {
    // `blur` contains `blu`, `scene` contains none of it, `formatting` is not
    // `formato`. Substring matching would report all three and the guard would
    // last a week.
    const css = ':root { --shadow-blur: 4px; --scene-height: 100vh; --formatting: 1; }';
    expect(checkItalianCustomProperties(css)).toEqual([]);
  });

  it('says nothing about Italian inside a comment', () => {
    const css = '/* il ciclo si dichiara sul contenitore */\n:root { --accent: #f26419; }';
    expect(checkItalianCustomProperties(css)).toEqual([]);
  });

  it('reports each name once, however often it appears', () => {
    const css = '.a { color: var(--accento); }\n.b { border-color: var(--accento); }';
    expect(checkItalianCustomProperties(css)).toHaveLength(1);
  });

  it('names the file it was given', () => {
    const violations = checkItalianCustomProperties(
      ':root { --accento: #f26419; }',
      'src/styles/tokens/colors.css',
    );
    expect(violations[0]!.detail).toContain('src/styles/tokens/colors.css');
  });
});

describe('checkMissingAccents', () => {
  it('passes on Italian written with its accents', () => {
    const text = 'Perché è già così, e non si può fare di più.';
    expect(checkMissingAccents(text, 'x.md')).toEqual([]);
  });

  it('reports the forms an Italian keyboard drops', () => {
    const text = 'Si fa cosi perche e gia deciso, e piu avanti non si puo tornare.';
    const violations = checkMissingAccents(text, 'x.md');
    expect(violations.map((v) => v.detail.match(/`([^`]+)`/)?.[1])).toEqual([
      'cosi',
      'perche',
      'gia',
      'piu',
      'puo',
    ]);
  });

  it('suggests the correct spelling', () => {
    const violations = checkMissingAccents('perche no', 'x.md');
    expect(violations[0]!.detail).toContain('perché');
  });

  it('gives the line number', () => {
    const violations = checkMissingAccents('prima riga\nseconda con perche\n', 'x.md');
    expect(violations[0]!.detail).toContain('on line 2');
  });

  it('leaves alone the words that are correct without an accent', () => {
    // `meta` is a word of its own — and a technical one; `sara` is a name.
    // Both were deliberately left out of the list: a guard that fires on a
    // correct word is a guard somebody disables.
    const text = 'La meta era Sara, e i meta Open Graph sono a posto.';
    expect(checkMissingAccents(text, 'x.md')).toEqual([]);
  });

  it('does not fire inside a longer word', () => {
    expect(checkMissingAccents('giacimento piumaggio perchezza', 'x.md')).toEqual([]);
  });

  it('leaves kebab-case identifiers alone', () => {
    // A slug cannot carry an accent: `citta` inside one is not a mistake, and
    // the frontmatter of the content files is full of them.
    expect(checkMissingAccents('venue: palazzo-citta-studi', 'x.md')).toEqual([]);
    // The same word in prose still is.
    expect(checkMissingAccents('la citta chiude', 'x.md')).toHaveLength(1);
  });
});
