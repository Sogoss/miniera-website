/* Negative tests for the three guards over the text this site does not have.
 *
 * The placeholders are deliberately unmistakable, which is most of the work:
 * nobody reads «Lorem ipsum dolor sit amet» as something an association said.
 * What these hold is the part that is not obvious — that the mark travels with
 * the text, that there is one place to replace them, and that none of it can
 * still be here the day the site gets an address of its own.
 */
import { describe, expect, it } from 'vitest';
import {
  checkNoPlaceholders,
  checkPlaceholderSource,
  checkPlaceholderText,
} from '../guards/placeholder.ts';
import { placeholderTexts } from '../../src/lib/placeholder.ts';

const LOREM = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
const TEXTS = [LOREM, 'Nome Cognome'];

const MARKED = `
  <section class="page-section">
    <h2>Le persone</h2>
    <div data-placeholder="true" class="placeholder">
      <p class="placeholder-mark"><span class="label">Segnaposto</span></p>
      <p>${LOREM}</p>
      <div><span>Nome Cognome</span></div>
    </div>
  </section>
`;

describe('checkPlaceholderText', () => {
  it('accepts a placeholder inside the block that declares it', () => {
    expect(checkPlaceholderText(MARKED, TEXTS, 'dist/chi-siamo/index.html')).toEqual([]);
  });

  it('reports the same text once the mark is gone', () => {
    // The way this defect actually happens: the frame and the chip are dropped
    // in a tidy-up, the words stay, and lorem ipsum becomes what the
    // association says.
    const bare = MARKED.replace('data-placeholder="true" ', '');
    const violations = checkPlaceholderText(bare, TEXTS, 'dist/chi-siamo/index.html');
    expect(violations).toHaveLength(2);
    expect(violations[0]!.detail).toContain('dist/chi-siamo/index.html');
  });

  it('reports a placeholder that fell outside the block', () => {
    const outside = `${MARKED}<p>${LOREM}</p>`;
    expect(checkPlaceholderText(outside, TEXTS)).toHaveLength(1);
  });

  it('is not fooled by a marked block that closed before the text', () => {
    // The scanner balances tags: a text after `</div>` is outside the block
    // even though the mark is above it in the file.
    const after = '<div data-placeholder><p>marcato</p></div>' + `<p>${LOREM}</p>`;
    expect(checkPlaceholderText(after, TEXTS)).toHaveLength(1);
  });

  it('reads the mark in both the forms a build writes it', () => {
    for (const mark of ['data-placeholder', 'data-placeholder="true"']) {
      expect(checkPlaceholderText(`<div ${mark}><p>${LOREM}</p></div>`, TEXTS)).toEqual([]);
    }
  });

  it('reads a text that wrapped across lines', () => {
    const wrapped = `<p>Lorem ipsum dolor\n     sit amet, consectetur adipiscing elit.</p>`;
    expect(checkPlaceholderText(wrapped, TEXTS)).toHaveLength(1);
  });

  it('says nothing about a page that carries none of them', () => {
    expect(checkPlaceholderText('<h1>Il programma</h1>', TEXTS)).toEqual([]);
    expect(checkPlaceholderText(MARKED, [])).toEqual([]);
  });

  it('has real sentences to hunt, so the assertions are not passing over nothing', () => {
    // Every guard here is handed `placeholderTexts()` by the build layer. An
    // empty list would make all of it agree, on every page, for ever.
    expect(placeholderTexts().length).toBeGreaterThan(5);
    for (const text of placeholderTexts()) expect(text.trim().length).toBeGreaterThan(3);
  });
});

describe('checkPlaceholderSource', () => {
  it('accepts a page that takes its placeholders from the module', () => {
    const page = `<p class="page-lead">{TEXTS.manifestoLead}</p>`;
    expect(checkPlaceholderSource(page, TEXTS, 'src/pages/chi-siamo.astro')).toEqual([]);
  });

  it('reports one written into the page', () => {
    const page = `<p>${LOREM}</p>`;
    const violations = checkPlaceholderSource(page, TEXTS, 'src/pages/chi-siamo.astro');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('src/lib/placeholder.ts');
  });

  it('ignores the rule written about rather than broken', () => {
    const commented = `/* Nome Cognome is what stands in for a director */\nfoo();`;
    expect(checkPlaceholderSource(commented, TEXTS, 'a.ts')).toEqual([]);
  });
});

describe('checkNoPlaceholders', () => {
  it('reports any marked block at all', () => {
    // Called only once `site` is set in astro.config.mjs — a real domain with
    // lorem ipsum under it is the one thing worse than no domain.
    const violations = checkNoPlaceholders(MARKED, 'dist/chi-siamo/index.html');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('src/lib/placeholder.ts');
  });

  it('counts them one by one', () => {
    expect(checkNoPlaceholders('<div data-placeholder>a</div><p data-placeholder>b</p>'))
      .toHaveLength(2);
  });

  it('says nothing about a page with the real text on it', () => {
    expect(checkNoPlaceholders('<h1>Chi siamo</h1><p>La Miniera è nata…</p>')).toEqual([]);
  });

  it('ignores a marked block that is commented out', () => {
    expect(checkNoPlaceholders('<!-- <div data-placeholder>a</div> -->')).toEqual([]);
  });
});
