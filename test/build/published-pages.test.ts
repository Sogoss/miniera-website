/* What every published page is, whatever it happens to contain.
 *
 * The base layout is what makes these true, and this is where «makes them true»
 * is checked instead of assumed: the assertions run over every page in dist/,
 * so a page written without the layout — or a layout that quietly stops
 * carrying something — is caught here and not in a browser.
 */
import { describe, expect, it } from 'vitest';
import { checkBrandSignature } from '../guards/brand.ts';
import { checkModalTargets, checkNoJsSwitch, checkSingleModal } from '../guards/modal.ts';
import { checkTimelineLinks, checkTimelineTargets, tickTags } from '../guards/timeline.ts';
import {
  checkDocumentBasics,
  checkOpenGraph,
  checkSkipLink,
  checkSkipLinkStyle,
} from '../guards/document.ts';
import {
  checkClipShapeReferences,
  checkDuplicateClipShapeIds,
  checkEmptyClipShapes,
} from '../guards/shapes.ts';
import { CLIP_SHAPES } from '../../src/lib/shapes.ts';
import { decodeEntities, publishedPages, readPublishedCss } from '../support/dist.ts';
import astroConfig from '../../astro.config.mjs';

const pages = publishedPages();

/* Whether the site knows its own address yet — asked of the configuration
   itself, not of its text. Grepping for `site:` missed it on a single line and
   found it inside a block comment, so the tripwire could have been armed or
   disarmed by the formatting of a file rather than by its meaning. */
const withDomain = Boolean((astroConfig as { site?: string }).site);

/** The shapes there are, read from the module that generates them.
 *
 *  Read out of the component until PR 6, with the same scanner the guard uses;
 *  since the geometry is generated, the ids in the component are an expression
 *  and the source no longer says what they are. Which puts the expectation
 *  where the other build assertions keep theirs — on the thing that decides,
 *  not on a copy of it. */
const declaredShapes = CLIP_SHAPES.map((shape) => shape.id);

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

  it.each(pages.map((page) => [page.path, page] as const))(
    '%s uses the brand in full wherever it uses it',
    (_path, page) => {
      // Rule 7, asked of what a reader gets. A page can lose the signature
      // without touching the component — writing the words by hand, building
      // its own header — and only the published markup sees that.
      expect(checkBrandSignature(decodeEntities(page.html), page.path)).toEqual([]);
    },
  );

  it.each(pages.map((page) => [page.path, page] as const))(
    '%s opens no modal that is not there',
    (_path, page) => {
      // The same silence as a clip path that resolves to nothing: the button is
      // pressed and the page stays as it was.
      expect(checkModalTargets(page.html, page.path)).toEqual([]);
      expect(checkSingleModal(page.html, page.path)).toEqual([]);
    },
  );

  it.each(pages.map((page) => [page.path, page] as const))(
    '%s shows one form of a control, not both',
    (_path, page) => {
      // Read out of the CSS this page receives, because that is where the
      // defect was: the rule was written correctly in global.css and lost a tie
      // to a component stylesheet the bundler put after it. Half the switch
      // worked, so with scripting off a dead button was published on top of the
      // links it was standing in for — and the source looked symmetrical.
      expect(checkNoJsSwitch(page.css, page.path)).toEqual([]);
    },
  );

  it.each(pages.map((page) => [page.path, page] as const))(
    '%s starts as `no-js` and takes it off from the head',
    (_path, page) => {
      // The other half of the same switch, and the half no stylesheet can
      // prove. `checkNoJsSwitch` reads the rule; what decides whether the rule
      // ever applies is the class on the document and the one line of the head
      // that removes it. Drop `class="no-js"` and
      // `html:not(.no-js) .no-js-only` matches for everybody: the WhatsApp link
      // and the list of recordings vanish for a reader with no scripting and
      // the dead button is back — which is exactly the defect this PR closed,
      // reachable again by a one-word edit with the guard still green.
      expect(page.html, 'the document does not start as `no-js`').toMatch(
        /<html\b[^>]*\bclass="[^"]*\bno-js\b/,
      );
      expect(page.html, 'nothing takes `no-js` off once a script runs').toMatch(
        /classList\.remove\(\s*['"]no-js['"]\s*\)/,
      );
    },
  );

  it.each(pages.map((page) => [page.path, page] as const))(
    '%s leads nowhere from a tick that is not a link',
    (_path, page) => {
      // Asked of every page and not only of the programme: the rail belongs to
      // the scroller today, and PR 13 puts navigation on the institutional
      // pages. A page with no ticks passes over an empty list, which is what
      // the assertion below is for.
      expect(checkTimelineLinks(page.html, page.path)).toEqual([]);
      expect(checkTimelineTargets(page.html, page.path)).toEqual([]);
    },
  );

  it('publishes a rail somewhere, so that the two tick guards have work to do', () => {
    // The anti-vacuity half of the pair above, and the same argument as the
    // brand one below it: rename `data-tick` and every assertion keeps passing
    // over a list of nothing, on every page, with no tick watched anywhere.
    // Found the way the guards find them, so that a rename cannot make this
    // half agree with itself while the other half stops looking.
    const ticks = pages.flatMap((page) => tickTags(page.html));
    expect(ticks.length, 'no page publishes a Timeline tick').toBeGreaterThan(0);
  });

  it('publishes at least one mark, so that the rule-7 guard has work to do', () => {
    // The anti-vacuity half. Rename `data-brand` in Brand.astro — a refactor, a
    // wrapper, a tidy-up — and every assertion above passes over an empty list
    // on every page while no mark is watched anywhere. The shape guard and the
    // cycle guard each got a companion like this; the brand guard had none.
    const marks = pages.filter((page) => /\sdata-brand(?=[\s=>/])/i.test(page.html));
    expect(marks.length).toBeGreaterThan(0);
  });

  it('publishes a skip link that is hidden until it is focused', () => {
    // The half of the skip link that lives in the CSS, and that no markup guard
    // can see: hidden with nothing to bring it back is worse than not having
    // one — a keyboard lands on something invisible. Read out of dist/, because
    // that is where a lost rule becomes visible.
    expect(checkSkipLinkStyle(readPublishedCss(), 'dist/')).toEqual([]);
  });

  it.each(pages.map((page) => [page.path, page] as const))(
    '%s defines no clip shape that is empty',
    (_path, page) => {
      // An empty <clipPath> clips everything away: the photo is published as a
      // hole while the id resolves and every other check passes. It is what the
      // generator produces for parameters it refuses to draw — it returns an
      // empty string rather than invent a shape — so this is the other half of
      // that decision, checked where it would land.
      expect(checkEmptyClipShapes(page.html, page.path)).toEqual([]);
    },
  );

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
