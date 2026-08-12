/* The programme, as it reaches a browser.
 *
 * Everything here is derived from the content: the number of scenes, their
 * order, which cycle paints which one. Written as literals, adding an evening
 * or opening a second venue would turn the suite red with nothing broken, and
 * the failure would point at this file instead of at the content — the same
 * argument as published-dates.test.ts, which this one sits next to.
 *
 * The dates and the four anchors are that file's business; this one is about
 * the scroller: one screen per evening, snapping, and staying fast with all of
 * them in one document.
 */
import { describe, expect, it } from 'vitest';
import { checkSingleScroller } from '../guards/scroller.ts';
import { publishedPages } from '../support/dist.ts';
import { collectionEntries } from '../support/frontmatter.ts';
import { sortByNumber } from '../../src/lib/events.ts';

const HOME = 'dist/index.html';
const home = publishedPages().find((page) => page.path === HOME);

/** The evenings as the content has them, in the order of the site. */
const evenings = sortByNumber(
  collectionEntries('eventi').map((entry) => ({
    number: Number(entry.data.number),
    cycle: String(entry.data.cycle ?? ''),
    photo: typeof entry.data.photo === 'string' ? entry.data.photo : undefined,
  })),
);

/** The cycle each evening belongs to, by the number that names it in the CSS. */
const cycleNumbers = new Map(
  collectionEntries('cicli').map((entry) => [entry.id, Number(entry.data.number)]),
);

/** Every scene of the published programme, with its opening tag. */
const scenes = [...(home?.html ?? '').matchAll(/<section\b[^>]*\bdata-scene\b[^>]*>/g)];

function attribute(tag: string, name: string): string | undefined {
  return new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1];
}

describe('the published programme', () => {
  it('is a page', () => {
    // Without this every assertion below reads an empty string and agrees.
    expect(home, `${HOME} is not in dist/`).toBeDefined();
    expect(evenings.length).toBeGreaterThan(1);
  });

  it('gives every evening one scene, in the order of the site', () => {
    expect(scenes.map((scene) => Number(attribute(scene[0], 'data-number')))).toEqual(
      evenings.map((evening) => evening.number),
    );
  });

  it('titles the evenings at the second level, under one title of its own', () => {
    // 81 evenings would be 81 <h1>s — the export's own structure, and the
    // reason vincoli-tecnici.md changed it. checkDocumentBasics already asks
    // for a single <h1>; what this adds is that the evenings are the <h2>s
    // under it rather than, say, paragraphs in bold.
    expect([...home!.html.matchAll(/<h1\b/g)]).toHaveLength(1);
    expect([...home!.html.matchAll(/<h2\b/g)]).toHaveLength(evenings.length);
  });

  it.each([
    ['scroll-snap-type', 'y mandatory'],
    ['scroll-snap-align', 'start'],
    ['content-visibility', 'auto'],
    ['contain-intrinsic-size', String.raw`auto var\(--scene-height\)`],
  ])('declares %s in the CSS this page receives', (property, value) => {
    // The two performance declarations have to travel together with the snap:
    // `content-visibility` lets the browser skip what is off screen, and only
    // the declared intrinsic height keeps the snap positions — and the opening
    // jump — where they belong while it does.
    //
    // Matched with the spacing left open: the minifier writes `prop:value`
    // with no space after the colon, so an assertion written the way a person
    // types CSS fails over a stylesheet that is perfectly correct.
    expect(home!.css).toMatch(new RegExp(`${property}\\s*:\\s*${value}`));
  });

  it('is one scrolling container and not one per scene', () => {
    // The export makes every scene scrollable inside the scroller, which makes
    // it ambiguous which box the arrow keys move.
    expect(checkSingleScroller(home!.css, HOME)).toEqual([]);
  });

  it('paints each scene with the cycle its evening belongs to', () => {
    for (const [at, evening] of evenings.entries()) {
      const published = Number(attribute(scenes[at]![0], 'data-cycle'));
      const expected = cycleNumbers.get(evening.cycle);
      expect(expected, `evening #${evening.number} names a cycle that is not in the collection`)
        .toBeDefined();
      expect(published, `evening #${evening.number} is painted by the wrong cycle`).toBe(expected);
    }
  });

  it('loads one image up front and the rest only when they are reached', () => {
    // The largest cost on a slow connection, and the reason all 81 evenings can
    // sit in one document. The eager one is the scene the reader lands on —
    // not the first in the document, which with the programme opening on the
    // next evening is somewhere up in the archive.
    const loading = [...home!.html.matchAll(/<img\b[^>]*\bloading="(\w+)"/g)].map((m) => m[1]);
    expect(loading.length, 'no images in the programme at all').toBeGreaterThan(1);
    expect(loading.filter((value) => value === 'eager').length).toBeLessThanOrEqual(1);

    const opening = scenes.findIndex((scene) => attribute(scene[0], 'data-open') === 'true');
    const openingScene = home!.html.slice(
      scenes[opening]!.index,
      scenes[opening + 1]?.index,
    );
    if (/<img/.test(openingScene)) {
      expect(openingScene).toMatch(/<img[^>]*loading="eager"/);
    }
  });

  it('jumps to the opening evening before the page is painted', () => {
    // The one thing here no stylesheet can do. Inline and synchronous on
    // purpose: bundled as a module it would run after the first paint, and the
    // programme would be drawn at the top and then jump.
    const script = /<script>([\s\S]*?)<\/script>/.exec(home!.html)?.[1] ?? '';
    expect(script, 'no inline script to open the programme').toContain('data-open');
    expect(home!.html).not.toMatch(/<script[^>]*\btype="module"/);
  });

  it('keeps working with that script switched off', () => {
    // The declared degradation: the programme opens on the oldest evening and
    // scrolls normally. What makes it true is that nothing else on the page
    // depends on the script — so nothing about a scene is hidden until it runs.
    expect(home!.css.replace(/\s+/g, ' ')).not.toMatch(/\.scene[^{]*\{[^}]*display: none/);
    expect(home!.html).not.toContain('hidden data-scene');
  });
});
