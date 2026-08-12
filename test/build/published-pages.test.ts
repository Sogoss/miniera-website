/* What every published page is, whatever it happens to contain.
 *
 * The base layout is what makes these true, and this is where «makes them true»
 * is checked instead of assumed: the assertions run over every page in dist/,
 * so a page written without the layout — or a layout that quietly stops
 * carrying something — is caught here and not in a browser.
 */
import { describe, expect, it } from 'vitest';
import {
  checkDocumentBasics,
  checkOpenGraph,
  checkSkipLink,
  checkSkipLinkStyle,
} from '../guards/document.ts';
import {
  checkClipShapeReferences,
  checkDuplicateClipShapeIds,
  clipShapeIds,
} from '../guards/shapes.ts';
import { publishedPages, readPublishedCss } from '../support/dist.ts';
import { read } from '../support/paths.ts';
import astroConfig from '../../astro.config.mjs';

const pages = publishedPages();

/* Whether the site knows its own address yet — asked of the configuration
   itself, not of its text. Grepping for `site:` missed it on a single line and
   found it inside a block comment, so the tripwire could have been armed or
   disarmed by the formatting of a file rather than by its meaning. */
const withDomain = Boolean((astroConfig as { site?: string }).site);

/** The shapes ClipShapes declares, read from the component with the same
 *  scanner the guard uses — a second regular expression written here would
 *  quietly stop finding a shape the day one is written with its attributes in
 *  another order. */
const declaredShapes = clipShapeIds(read('src/components/ClipShapes.astro'));

describe('every published page', () => {
  it('exists in the first place', () => {
    // Without this, every loop below passes over an empty list.
    expect(pages.length).toBeGreaterThan(0);
  });

  it.each(pages.map((page) => [page.path, page] as const))(
    '%s declares its language, charset, viewport and one h1',
    (_path, page) => {
      expect(checkDocumentBasics(page.html, page.path)).toEqual([]);
    },
  );

  it.each(pages.map((page) => [page.path, page] as const))(
    '%s carries the tags a link preview needs',
    (_path, page) => {
      expect(checkOpenGraph(page.html, page.path, { withDomain })).toEqual([]);
    },
  );

  it.each(pages.map((page) => [page.path, page] as const))(
    '%s opens with a skip link that lands somewhere',
    (_path, page) => {
      expect(checkSkipLink(page.html, page.path)).toEqual([]);
    },
  );

  it.each(pages.map((page) => [page.path, page] as const))(
    '%s asks for no clip shape it does not carry',
    (_path, page) => {
      // Nothing clips anything yet — the shapes are defined here and used from
      // PR 6 — so today this passes over an empty list of references. It is the
      // first real use that has to arrive already guarded, not this page.
      expect(checkClipShapeReferences(page.html, page.css, page.path)).toEqual([]);
    },
  );

  it.each(pages.map((page) => [page.path, page] as const))(
    '%s defines each clip shape once',
    (_path, page) => {
      expect(checkDuplicateClipShapeIds(page.html, page.path)).toEqual([]);
    },
  );

  it('publishes a skip link that is hidden until it is focused', () => {
    // The half of the skip link that lives in the CSS, and that no markup guard
    // can see: hidden with nothing to bring it back is worse than not having
    // one — a keyboard lands on something invisible. Read out of dist/, because
    // that is where a lost rule becomes visible.
    expect(checkSkipLinkStyle(readPublishedCss(), 'dist/')).toEqual([]);
  });

  it('carries every shape the component declares, on every page', () => {
    // The other half of the reference guard, and the half that can be checked
    // today: the definitions have to reach the page. If the layout stopped
    // including ClipShapes nothing else in the suite would notice until the
    // first photo went out uncut.
    expect(declaredShapes.length).toBeGreaterThan(0);
    for (const page of pages) {
      for (const shape of declaredShapes) {
        expect(page.html, `${page.path} does not carry ${shape}`).toContain(`id="${shape}"`);
      }
    }
  });

  it('names its shapes as Material 3 does, not as the export does', () => {
    // The rename is the kind that half-happens: the export's Italian ids are
    // still in design-export/, which is the specification and stays as it is,
    // but nothing of it should reach dist/.
    for (const page of pages) {
      for (const italian of ['f-quadrifoglio', 'f-esafoglio', 'f-ottofoglio', 'f-gemma', 'f-obliqua', 'm-ottofoglio']) {
        expect(page.html, `${page.path} still carries ${italian}`).not.toContain(italian);
      }
    }
  });
});
