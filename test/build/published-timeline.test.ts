/* The Timeline, as it reaches a browser.
 *
 * Read out of dist/ and not out of the component, because most of what this
 * PR decided is only true there: that a tick is a link and not a button, that
 * exactly one of them is marked current before any script has run, that the
 * accent of the opening evening is on the document, and that the two tick
 * colours survived the minifier as rgba and not as anything else.
 *
 * Everything expected here comes from the content. Written as literals, adding
 * an evening would turn the suite red with nothing broken and point at this
 * file instead of at the programme.
 */
import { describe, expect, it } from 'vitest';
import { attributeOf } from '../guards/document.ts';
import { checkSingleScroller, scrollableRules } from '../guards/scroller.ts';
import { checkTimelineLinks, checkTimelineTargets, tickTags } from '../guards/timeline.ts';
import { publishedPages } from '../support/dist.ts';
import { collectionEntries } from '../support/frontmatter.ts';
import { sortByNumber } from '../../src/lib/events.ts';

const HOME = 'dist/index.html';
const home = publishedPages().find((page) => page.path === HOME);
const html = home?.html ?? '';

/** The evenings as the content has them, in the order of the site. */
const evenings = sortByNumber(
  collectionEntries('eventi').map((entry) => ({
    number: Number(entry.data.number),
    cycle: String(entry.data.cycle ?? ''),
  })),
);

const cycleNumbers = new Map(
  collectionEntries('cicli').map((entry) => [entry.id, Number(entry.data.number)]),
);

/* Every tick of the published rail, and every attribute read by the same two
   helpers the guards use. A fourth private copy of «find the ticks» is three
   renames away from a file that asserts nothing over an empty list, and a
   private `attributeOf` is one that does not know `data-href` is not `href` —
   which is the mistake test/guards/document.ts exists to have made once. */
const ticks = tickTags(html);

/** The evening the programme opens on, read where the scroller marks it. */
const openingNumber = Number(
  attributeOf(
    /<section\b[^>]*\bdata-open="true"[^>]*>/.exec(html)?.[0] ?? '',
    'data-number',
  ),
);

/** How far either side of the current tick the build says the window reaches. */
const span = Number(
  attributeOf(/<nav\b[^>]*\bdata-timeline\b[^>]*>/.exec(html)?.[0] ?? '', 'data-window'),
);

describe('the published Timeline', () => {
  it('is on the page', () => {
    // Without this every assertion below reads an empty list and agrees with
    // itself: a rail that was never rendered passes «every tick is a link».
    expect(home, `${HOME} is not in dist/`).toBeDefined();
    expect(html).toMatch(/<nav\b[^>]*\bdata-timeline\b/);
    expect(evenings.length).toBeGreaterThan(1);
  });

  it('gives every evening one tick, in the order of the site', () => {
    // All of them are in the markup even though only a window shows: they are
    // the programme, and a crawler and Ctrl+F should find them.
    expect(ticks.map((tick) => attributeOf(tick.tag, 'href'))).toEqual(
      evenings.map((evening) => `#serata-${evening.number}`),
    );
  });

  it('makes every tick a link that leads to its evening', () => {
    expect(checkTimelineLinks(html, HOME)).toEqual([]);
    expect(checkTimelineTargets(html, HOME)).toEqual([]);
  });

  it('marks one tick as current, and it is the evening the programme opens on', () => {
    // Written by the build and not only by the script: in dist/ there is no
    // script running, so a rail that waited for one would arrive with nothing
    // marked — and this assertion is the only place that can tell.
    const current = ticks.filter((tick) => attributeOf(tick.tag, 'aria-current'));
    expect(current).toHaveLength(1);
    expect(openingNumber).toBeGreaterThan(0);
    expect(attributeOf(current[0]!.tag, 'href')).toBe(`#serata-${openingNumber}`);
  });

  it('shows a window of ticks around the current one, and only those', () => {
    // What the CSS reads: no attribute at all is «outside the window», and the
    // value is the distance itself — which is how the bar on a phone keeps
    // three of the eleven the rail shows, without a second number in a script.
    const current = ticks.findIndex((tick) => attributeOf(tick.tag, 'aria-current'));
    expect(attributeOf(ticks[current]!.tag, 'data-near')).toBe('0');
    expect(span).toBeGreaterThan(0);

    /* Which ticks carry the attribute and not only what the ones that do say:
       a build that ranked all eighty-one satisfied every assertion this used to
       make, and published the whole archive at once down the side of the page.
       The width is read from `data-window`, which is already published for the
       script — so this asks the build about itself instead of becoming a second
       place that knows the number. */
    const from = Math.max(0, current - span);
    const to = Math.min(ticks.length - 1, current + span);

    for (const [at, tick] of ticks.entries()) {
      const rank = attributeOf(tick.tag, 'data-near');
      if (at < from || at > to) {
        expect(rank, `tick ${at} is outside the window and still ranked`).toBeUndefined();
        continue;
      }
      expect(Number(rank), `tick ${at} is ranked further than it is`).toBe(
        Math.abs(at - current),
      );
    }
  });

  it('opens the document on the accent of that evening', () => {
    // On <html>, so that what lies outside every scene takes it. Without it the
    // rail renders in the brand orange over an evening of any other cycle: a
    // page that is perfectly correct and the wrong colour.
    const document = /<html\b[^>]*>/.exec(html)?.[0] ?? '';
    const opening = evenings.find((evening) => evening.number === openingNumber);
    expect(opening, 'no evening carries data-open in the markup').toBeDefined();
    expect(Number(attributeOf(document, 'data-cycle'))).toBe(cycleNumbers.get(opening!.cycle));
  });

  it('publishes the two tick colours as rgba over the cream triple', () => {
    // The export had them as `color-mix(… 60%)` and `… 34%`, which rule 3 keeps
    // out. checkNoColorMixOrOklch watches the other half of that; this watches
    // that the two tokens arrived at all and kept their values — a rail whose
    // ranks all render the same colour is a rail that says nothing.
    expect(home!.css).toMatch(/--tick-near:\s*rgba\(var\(--cream-100-rgb\),\s*\.?0?\.?6\)/);
    expect(home!.css).toMatch(/--tick-far:\s*rgba\(var\(--cream-100-rgb\),\s*\.?0?\.?44\)/);
  });

  it('shows every evening, and hides only the dates of the far ones', () => {
    /* The assertion that was missing, and its absence is what let PR 8 publish
       a rail that could not reach the archive: the ticks were all in the markup
       — which the count above proves — and seventy of them were `display:
       none`, so from the eleven on screen there was no way to the twelfth.

       Read on the published CSS, because «visible» is not something the markup
       says. Hiding what is *inside* a tick is legitimate and is how the two
       ranks are told apart; hiding the tick is not. */
    const hidden = [...home!.css.matchAll(/([^{}]*timeline-tick[^{}]*)\{([^}]*)\}/g)].filter(
      ([, selector, body]) =>
        /display:\s*none/.test(body ?? '') && !/tick-date|tick-mark/.test(selector ?? ''),
    );
    expect(hidden.map(([, selector]) => selector)).toEqual([]);

    // And the window still decides which ones carry their date: without this
    // the rule above is satisfied by a rail that labels all eighty-one.
    expect(home!.css).toMatch(/:not\(\[data-near\]\)[^{]*tick-date[^{]*\{[^}]*display:\s*none/);
  });

  it('is clipped and not a second scrolling container', () => {
    // The export centres a strip of eighty-one pills by translating it, and a
    // rail that scrolled instead would be the nested scroller of rule 1 in
    // another costume — with the arrow keys ambiguous between the two.
    expect(checkSingleScroller(home!.css, HOME)).toEqual([]);
    expect(home!.css).toMatch(/\.timeline[^{]*\{[^}]*overflow:\s*hidden/);

    /* The one exception, and it has to be the horizontal one: the bar on a
       phone scrolls sideways through the archive, and says so in its selector
       because the CSS cannot show that a box is a bar.

       Read with the guard's own parser and not with a pattern of its own: the
       source writes `overflow-x: auto; overflow-y: hidden` and the minifier
       publishes `overflow: auto hidden`, so an assertion spelled the way a
       person types CSS fails over a stylesheet that is exactly right. It is the
       collapsed fallback of rule 4 in its mildest form — here nothing is lost,
       only rewritten — and the answer is the same: read dist/, and read it the
       way the code does. */
    const bar = scrollableRules(home!.css).filter((rule) =>
      /\[data-timeline\b/.test(rule.selector),
    );
    expect(bar.length, 'the bar declares no scrolling at all').toBeGreaterThan(0);
    expect(bar.every((rule) => !rule.vertically)).toBe(true);
  });

  it('animates no jump, and can still be asked for less movement', () => {
    /* No `scroll-behavior: smooth` anywhere, and its absence is the fix rather
       than an omission: the property reaches only the scrolls a script asks
       for, every one of those is a jump to an evening, and an animated jump can
       be interrupted — the second of two ticks tapped in quick succession is
       dropped by the engine and the programme stays on the first while the
       rail, the accent and the address name the second. Read in dist/ because
       that is where somebody putting it back would put it. */
    expect(home!.css).not.toMatch(/scroll-behavior:\s*smooth/);

    // And the refusal that was always there: under reduced motion the snap goes
    // too, which is what turns the scroller into a list.
    const reduced = /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?\}\s*)\}/.exec(
      home!.css,
    );
    expect(reduced, 'no reduced-motion block in the published CSS').not.toBeNull();
    expect(reduced![1]).toMatch(/scroll-behavior:\s*auto\s*!important/);
    expect(reduced![1]).toMatch(/scroll-snap-type:\s*none\s*!important/);
  });
});
