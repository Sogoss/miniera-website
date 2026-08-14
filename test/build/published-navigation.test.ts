/* The navigation, as it reaches a browser.
 *
 * Everything expected here is derived from src/lib/navigation.ts: the voices,
 * their order, which of them leads somewhere. A copy of that list written here
 * would answer a question about this file — and the day somebody adds a voice,
 * the failure would point at a test instead of at the navigation.
 *
 * What is worth checking is what nothing else would notice. A navigation that
 * marks no current page renders perfectly and tells the reader they are
 * nowhere. A voice written as a link with the address left off looks like the
 * others and does nothing. And a disclosure driven by a script is a menu that
 * does not open for whoever has none — the whole reason it is a `<details>`.
 */
import { describe, expect, it } from 'vitest';
import { elementsWith } from '../guards/document.ts';
import { decodeEntities, publishedPages } from '../support/dist.ts';
import { NAVIGATION, currentHref } from '../../src/lib/navigation.ts';

const pages = publishedPages();

/** The navigation of a page, from its opening tag to its closing one. */
function navigationOf(html: string): string {
  const [found] = elementsWith(html, 'data-navigation');
  return found ? html.slice(found.index, found.to) : '';
}

/** The address a published page answers at: `dist/chi-siamo/index.html` is
 *  `/chi-siamo`, and `dist/index.html` is `/`. */
function routeOf(path: string): string {
  return path.replace(/^dist/, '').replace(/\/index\.html$/, '') || '/';
}

const withNav = pages.map((page) => ({
  ...page,
  route: routeOf(page.path),
  nav: decodeEntities(navigationOf(page.html)),
}));

describe('the published navigation', () => {
  it('is on every page, including the ones that are not in it', () => {
    // In the layout for the same reason as the clip shapes and the cycle
    // accents: a page that forgot it would not fail — it would publish
    // something perfectly readable with no way out of it.
    expect(pages.length).toBeGreaterThan(0);
    for (const page of withNav) {
      expect(page.nav, `${page.path} publishes no navigation`).not.toBe('');
    }
  });

  it.each(withNav.map((page) => [page.path, page] as const))(
    '%s names the four voices the site declares',
    (_path, page) => {
      for (const item of NAVIGATION) {
        expect(page.nav, `«${item.label}» is missing`).toContain(item.label);
      }
    },
  );

  it.each(withNav.map((page) => [page.path, page] as const))(
    '%s writes every voice that leads somewhere as a link',
    (_path, page) => {
      for (const item of NAVIGATION) {
        if (item.href === undefined) continue;
        expect(page.nav, `«${item.label}» is not a link to ${item.href}`).toMatch(
          new RegExp(`<a[^>]*href="${item.href}"`),
        );
      }
    },
  );

  it.each(withNav.map((page) => [page.path, page] as const))(
    '%s leaves the voice with no page as text',
    (_path, page) => {
      // «Rassegna stampa» has no page: there is nothing to link to, and an
      // `<a>` with no href is not a link — no focus, no announcement, and a
      // voice a reader tries once. `checkAnchorsWithoutHref` says the same
      // thing about the page as a whole; this says it about the voice.
      for (const item of NAVIGATION) {
        if (item.href !== undefined) continue;
        expect(page.nav, `«${item.label}» was made a link`).not.toMatch(
          new RegExp(`<a[^>]*>[^<]*${item.label}`),
        );
        expect(page.nav, `«${item.label}» is published without its note`).toContain(
          item.note ?? '',
        );
      }
    },
  );

  it.each(withNav.map((page) => [page.path, page] as const))(
    '%s marks the voice the reader is standing in, once per form',
    (_path, page) => {
      /* The list is rendered twice — the row of the desktop design and the
         phone's disclosure — and one of the two is always `display: none`, so
         exactly one is in the accessibility tree. Both carry the mark, which is
         why the count is two and not one.

         `aria-current="page"` and not `aria-current` at large: the Timeline
         marks its current tick with `aria-current="true"`, and a check that
         counted both would be counting two different questions. */
      const marked = [...page.nav.matchAll(/aria-current="page"/g)];
      const expected = currentHref(page.route);

      if (expected === undefined) {
        // The component gallery is in no voice: a service page, out of the
        // index and out of the navigation.
        expect(marked, `${page.route} marks a voice it is not on`).toHaveLength(0);

        /* And the summary says «Menu», which is the same question asked of the
           control that has to carry a name. Looked up as «the voice whose href
           is the current one», nothing matches nothing — and `undefined` is the
           href of «Rassegna stampa», the one voice with no page: the phone's
           menu named a page that does not exist, on a page the reader was not
           on, and nothing about it failed. */
        expect(page.nav, `${page.route} names a voice in its summary`).toMatch(
          /<summary[^>]*>\s*<span[^>]*>Menu<\/span>/,
        );
        return;
      }

      expect(marked, `${page.route} marks ${marked.length} voices`).toHaveLength(2);
      const links = [...page.nav.matchAll(/<a[^>]*href="([^"]*)"[^>]*aria-current="page"/g)];
      expect(links.map((link) => link[1])).toEqual([expected, expected]);
    },
  );

  it('marks «Programma» on the route of an evening, which is the programme', () => {
    // /81 is the scroller opened on the eighty-first evening, not a page of its
    // own. Left unmarked, eighty-one pages would publish a navigation saying
    // the reader is nowhere.
    const evening = withNav.find((page) => /^\/\d+$/.test(page.route));
    expect(evening, 'no evening route in dist/').toBeDefined();
    expect(evening!.nav).toMatch(/<a[^>]*href="\/"[^>]*aria-current="page"/);
  });

  it.each(withNav.map((page) => [page.path, page] as const))(
    '%s opens its menu with a <details>, which needs no script',
    (_path, page) => {
      // The design's dropdown is a button and a handler. This is the same
      // decision as the Timeline's ticks: the element that already does the
      // job brings the focus, the keyboard and the announcement with it, and
      // works for a reader whose scripts never ran.
      expect(page.nav).toMatch(/<details\b/);
      expect(page.nav).toMatch(/<summary\b/);
    },
  );

  it('is driven by no script at all', () => {
    // What would take the decision above back without touching the markup: a
    // few lines that open the menu themselves. Nothing in the published
    // scripts knows the navigation exists.
    for (const page of pages) {
      const scripts = [...page.html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(
        (match) => match[1] ?? '',
      );
      for (const script of scripts) {
        expect(script, `${page.path} scripts its navigation`).not.toMatch(
          /site-nav|data-navigation/,
        );
      }
    }
  });

  it.each(withNav.map((page) => [page.path, page] as const))(
    '%s carries the mark, in full, back to the programme',
    (_path, page) => {
      // Rule 7 is checked on every page already; what this adds is that the
      // mark in the navigation is the way home. In the design it is a button
      // that changes a state — here there is a page to go to.
      expect(page.nav).toMatch(/<a[^>]*href="\/"[^>]*>[\s\S]*?data-brand/);
    },
  );

  it.each(withNav.map((page) => [page.path, page] as const))(
    '%s puts the navigation before the content, where a keyboard meets it',
    (_path, page) => {
      // The skip link is first — `checkSkipLink` asks that of every page — and
      // this is what makes the skip link worth having: the navigation is what
      // it skips.
      const nav = page.html.indexOf('data-navigation');
      const main = page.html.indexOf('<main');
      expect(nav).toBeGreaterThan(-1);
      expect(main).toBeGreaterThan(-1);
      expect(nav, 'the navigation comes after the content').toBeLessThan(main);
    },
  );
});
