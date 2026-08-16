/* Negative tests for the five guards over the text this site does not have.
 *
 * The placeholders are deliberately unmistakable, which is most of the work:
 * nobody reads «Lorem ipsum dolor sit amet» as something an association said.
 * What these hold is the part that is not obvious — that the mark travels with
 * the text, that there is one place to replace them, and that none of it can
 * still be here the day the site gets an address of its own.
 */
import { describe, expect, it } from 'vitest';
import {
  checkDeclaredPhotos,
  checkNoPlaceholders,
  checkPlaceholderPhotos,
  checkPlaceholderSource,
  checkPlaceholderText,
} from '../guards/placeholder.ts';
import { PLACEHOLDER_PHOTOS, placeholderTexts } from '../../src/lib/placeholder.ts';

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

/* The photographs, which are the one placeholder the marking cannot reach: a
   picture has no `data-placeholder` around it and looks exactly like the real
   thing will look. */

/* What Astro publishes: the stem, a hash, and an extension that is not the
   one on the disk. A guard hunting `serata-esempio.png` finds nothing here. */
const PUBLISHED = `<img src="/_astro/serata-esempio.BrSdkrOv_1lOivg.webp" alt="" />`;

describe('checkPlaceholderPhotos', () => {
  it('says nothing while the site has no address of its own', () => {
    // Two generated pictures on a pages.dev nobody can find are a site being
    // built. The same two under the association's name are something else.
    expect(checkPlaceholderPhotos(PUBLISHED, PLACEHOLDER_PHOTOS, { withDomain: false }))
      .toEqual([]);
  });

  it('reports one once the domain is set', () => {
    const violations = checkPlaceholderPhotos(
      PUBLISHED,
      PLACEHOLDER_PHOTOS,
      { withDomain: true },
      'dist/index.html',
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('serata-esempio.png');
  });

  it('finds it through the hash the build puts in the name', () => {
    // The assertion that this guard can fire at all: the name it is given and
    // the name on the page are never the same string.
    expect(PUBLISHED).not.toContain('serata-esempio.png');
    expect(checkPlaceholderPhotos(PUBLISHED, PLACEHOLDER_PHOTOS, { withDomain: true }))
      .toHaveLength(1);
  });

  it('counts every size in a srcset separately', () => {
    const srcset = `<img srcset="/_astro/sala-esempio.A_1.webp 400w, /_astro/sala-esempio.A_2.webp 800w">`;
    expect(checkPlaceholderPhotos(srcset, PLACEHOLDER_PHOTOS, { withDomain: true }))
      .toHaveLength(2);
  });

  it('does not mistake a longer name that starts the same way', () => {
    // `serata-esempio-2024.webp` is a different photograph, and one nobody
    // declared: the dot after the stem is what separates them.
    const other = `<img src="/_astro/serata-esempio-2024.Bx1_a.webp">`;
    expect(checkPlaceholderPhotos(other, PLACEHOLDER_PHOTOS, { withDomain: true })).toEqual([]);
  });

  it('says nothing about a page carrying a real photograph', () => {
    const real = `<img src="/_astro/serata-81-ritratto.Cx9.webp">`;
    expect(checkPlaceholderPhotos(real, PLACEHOLDER_PHOTOS, { withDomain: true })).toEqual([]);
  });
});

describe('checkDeclaredPhotos', () => {
  it('accepts a list that still points at files', () => {
    expect(checkDeclaredPhotos(PLACEHOLDER_PHOTOS, [...PLACEHOLDER_PHOTOS])).toEqual([]);
  });

  it('reads a path as well as a bare name', () => {
    expect(
      checkDeclaredPhotos(PLACEHOLDER_PHOTOS, PLACEHOLDER_PHOTOS.map((p) => `src/assets/photos/${p}`)),
    ).toEqual([]);
  });

  it('reports a declaration whose file has gone', () => {
    // The one that matters, because the failure it prevents is silence: a
    // renamed photograph leaves checkPlaceholderPhotos hunting a stem that can
    // never appear, and reporting nothing is exactly what it would do anyway.
    const violations = checkDeclaredPhotos(['sala-esempio.png'], ['sala-vera.jpg']);
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('sala-esempio.png');
  });

  it('reports each one separately', () => {
    // The count comes from the list, not from a number written here: PR 18 added
    // four portraits and this said 2, which is a test failing on correct work —
    // and the first thing anybody does with one of those is edit the number,
    // which is how a check stops checking.
    expect(checkDeclaredPhotos(PLACEHOLDER_PHOTOS, [])).toHaveLength(
      PLACEHOLDER_PHOTOS.length,
    );
    expect(PLACEHOLDER_PHOTOS.length).toBeGreaterThan(1);
  });

  it('says nothing when nothing is declared', () => {
    // Which is what PR 20 leaves behind: the real photographs arrive, the list
    // empties, and both guards go quiet because there is nothing to watch.
    expect(checkDeclaredPhotos([], ['sala-vera.jpg'])).toEqual([]);
  });
});
