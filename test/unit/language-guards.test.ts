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
  checkItalianDataAttributes,
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

describe('checkItalianDataAttributes', () => {
  it('passes on the renamed attribute', () => {
    const markup = '<article data-cycle={cycle.number} data-theme="paper">x</article>';
    expect(checkItalianDataAttributes(markup)).toEqual([]);
  });

  it('reports an attribute left in Italian in the markup', () => {
    // The half the CSS guard cannot see. Written this way the stylesheet's
    // [data-cycle="N"] rules match nothing and every evening keeps the default
    // accent, with the build and `astro check` both perfectly happy.
    const violations = checkItalianDataAttributes(
      '<article data-ciclo={cycle.number}>x</article>',
      'src/pages/index.astro',
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]!.rule).toBe('language');
    expect(violations[0]!.detail).toContain('data-ciclo');
    expect(violations[0]!.detail).toContain('src/pages/index.astro');
  });

  it('sees the published form as well as the source one', () => {
    // Astro writes the expression out as an ordinary attribute: dist/ is where
    // an attribute the source builds at runtime becomes readable at all.
    expect(checkItalianDataAttributes('<article data-ciclo="3">x</article>')).toHaveLength(1);
  });

  it('gives the line number', () => {
    const violations = checkItalianDataAttributes('<main>\n  <p data-serata="81">x</p>\n</main>');
    expect(violations[0]!.detail).toContain('on line 2');
  });

  it('leaves the attribute selector to the guard that owns it', () => {
    // Otherwise a stylesheet with an Italian selector is reported twice, and
    // whoever reads the output learns that the two guards overlap.
    expect(checkItalianDataAttributes('[ data-ciclo="2" ] { --accent: #cb9e00; }')).toEqual([]);
    expect(checkItalianDataAttributes('[data-ciclo="2"] { --accent: #cb9e00; }')).toEqual([]);
  });

  it('says nothing about an attribute named inside a comment', () => {
    const markup = '<!-- data-ciclo="2" era il nome vecchio -->\n<article data-cycle="2">x</article>';
    expect(checkItalianDataAttributes(markup)).toEqual([]);
  });

  it('compares whole segments, not substrings', () => {
    // `data-blurred` contains `blu`, and reporting it would be the end of the
    // guard.
    expect(checkItalianDataAttributes('<p data-blurred="1" data-format="short">x</p>')).toEqual([]);
  });

  it('reports each attribute once, however often it appears', () => {
    const markup = '<p data-ciclo="1">a</p>\n<p data-ciclo="2">b</p>';
    expect(checkItalianDataAttributes(markup)).toHaveLength(1);
  });
});
