/* Negative tests for the guards over the addresses of the programme.
 *
 * Both defects are invisible while anybody is looking at the site: an evening
 * with no route of its own only fails when the address it wrote into the bar is
 * reloaded or sent to somebody, and a pushed history entry only fails when the
 * reader presses back — by which time they blame the browser.
 */
import { describe, expect, it } from 'vitest';
import {
  checkEveningRoutes,
  checkHistoryPush,
  checkInternalLinks,
  linkTarget,
  pageLinks,
  publishedNumbers,
} from '../guards/routes.ts';

const PROGRAMME = `
  <section data-scene data-number="78" data-state="past"></section>
  <section data-scene data-number="80" data-state="cancelled"></section>
  <section data-scene data-number="81" data-state="upcoming" data-open="true"></section>
`;

describe('checkEveningRoutes', () => {
  it('accepts a programme whose every evening has a page', () => {
    expect(checkEveningRoutes(PROGRAMME, ['78', '80', '81'], 'dist/index.html')).toEqual([]);
  });

  it('reports an evening with no page of its own', () => {
    // What a route that failed to generate looks like from the markup: the
    // scene is there, the script will write `/80` into the address bar, and
    // reloading that is a 404.
    const violations = checkEveningRoutes(PROGRAMME, ['78', '81'], 'dist/index.html');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('#80');
    expect(violations[0]!.detail).toContain('dist/index.html');
  });

  it('reports each missing evening once, not once per page it appears on', () => {
    expect(checkEveningRoutes(PROGRAMME + PROGRAMME, ['81'])).toHaveLength(2);
  });

  it('is not satisfied by a route that merely looks like the one asked for', () => {
    // `/810` is a different evening, and string containment would have said yes.
    expect(checkEveningRoutes(PROGRAMME, ['780', '800', '810'])).toHaveLength(3);
  });

  it('says nothing about a page with no evenings on it', () => {
    expect(checkEveningRoutes('<main><h1>Chi siamo</h1></main>', [])).toEqual([]);
  });

  it('reads the numbers a page publishes', () => {
    expect(publishedNumbers(PROGRAMME).map((found) => found.number)).toEqual(['78', '80', '81']);
  });
});

describe('checkHistoryPush', () => {
  it('accepts the address being replaced', () => {
    const source = `history.replaceState(null, '', '/' + number);`;
    expect(checkHistoryPush(source, 'src/components/Programme.astro')).toEqual([]);
  });

  it('reports the address being pushed', () => {
    // One entry per evening scrolled past, and a back button that walks the
    // archive backwards instead of leaving the site.
    const source = `history.pushState(null, '', '/' + number);`;
    const violations = checkHistoryPush(source, 'src/components/Programme.astro');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('replaceState');
    expect(violations[0]!.detail).toContain('src/components/Programme.astro');
  });

  it('reads it through a local alias too', () => {
    // `var push = history.pushState.bind(history)` is the same call written so
    // that the obvious pattern misses it.
    expect(checkHistoryPush(`var push = history.pushState.bind(history);`, 'a.ts')).toHaveLength(1);
    expect(checkHistoryPush(`window.history . pushState (null, '', '/1');`, 'a.ts')).toHaveLength(1);
  });

  it('ignores the rule written about rather than broken', () => {
    const commented = `// never pushState here, the back button would walk the archive\nfoo();`;
    expect(checkHistoryPush(commented, 'a.ts')).toEqual([]);

    const prose = `const why = "pushState leaves one entry per evening";`;
    expect(checkHistoryPush(prose, 'a.ts')).toEqual([]);
  });

  it('says nothing about a file that touches no history', () => {
    expect(checkHistoryPush(`const a = 1;`, 'a.ts')).toEqual([]);
  });
});

/* The other end of the same question: there an evening had an address and no
   page, here a link has a page and no page at the other end. Both are 404s
   nobody meets while testing — a link is followed by readers, not by builds. */
describe('checkInternalLinks', () => {
  const ROUTES = ['/', '/81', '/chi-siamo', '/contatti', '/favicon.svg'];

  const NAVIGATION = `
    <nav>
      <a href="/">Programma</a>
      <span data-soon>Rassegna stampa</span>
      <a href="/chi-siamo" aria-current="page">Chi siamo</a>
      <a href="/contatti">Contatti</a>
    </nav>
  `;

  it('accepts a navigation whose every link has a page', () => {
    expect(checkInternalLinks(NAVIGATION, ROUTES, 'dist/chi-siamo/index.html')).toEqual([]);
  });

  it('reports the voice that was given an address before there was a page', () => {
    // The whole reason «Rassegna stampa» is text: the day somebody makes it a
    // link, this is what says the page is not there.
    const withLink = NAVIGATION.replace(
      '<span data-soon>Rassegna stampa</span>',
      '<a href="/rassegna">Rassegna stampa</a>',
    );
    const violations = checkInternalLinks(withLink, ROUTES, 'dist/index.html');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('/rassegna');
  });

  it('is not satisfied by a route that merely looks like the one asked for', () => {
    expect(checkInternalLinks('<a href="/chisiamo">Chi siamo</a>', ROUTES)).toHaveLength(1);
    expect(checkInternalLinks('<a href="/81/82">più serate</a>', ROUTES)).toHaveLength(1);
  });

  it('does not mind a trailing slash, which is how a browser writes it', () => {
    expect(checkInternalLinks('<a href="/chi-siamo/">Chi siamo</a>', ROUTES)).toEqual([]);
  });

  it('leaves alone what is not a page of this site', () => {
    const elsewhere = `
      <a href="https://www.youtube.com/@laminieraculturale">Rivedi</a>
      <a href="mailto:ciao@example.it">Scrivici</a>
      <a href="tel:+390110000000">Chiamaci</a>
      <a href="//example.org/x">Fuori</a>
      <a href="#serata-81">La serata</a>
    `;
    expect(checkInternalLinks(elsewhere, ROUTES)).toEqual([]);
  });

  it('resolves a relative link against the page that carries it', () => {
    // `contatti` written on /chi-siamo does not reach the contacts page: it
    // reaches /chi-siamo/contatti, which is nothing. In a browser it is one
    // click to find out and in a build it is silent.
    expect(checkInternalLinks('<a href="contatti">Scrivici</a>', ROUTES, 'dist/chi-siamo/index.html'))
      .toHaveLength(1);
    expect(checkInternalLinks('<a href="../contatti">Scrivici</a>', ROUTES, 'dist/chi-siamo/index.html'))
      .toEqual([]);
  });

  it('drops the query and the fragment before asking', () => {
    expect(checkInternalLinks('<a href="/chi-siamo?da=nav#persone">Chi siamo</a>', ROUTES))
      .toEqual([]);
  });

  it('reports a missing page once, however many links point at it', () => {
    const twice = '<a href="/rassegna">a</a><a href="/rassegna">b</a>';
    expect(checkInternalLinks(twice, ROUTES)).toHaveLength(1);
  });

  it('ignores a link that is commented out', () => {
    // Work in progress is not a published link, and a guard that reported it
    // would be reporting somebody mid-thought.
    expect(checkInternalLinks('<!-- <a href="/rassegna">presto</a> -->', ROUTES)).toEqual([]);
  });

  it('reads the links of a page whatever order the attributes are in', () => {
    const found = pageLinks('<a class="x" href="/uno">1</a><a href=\'/due\' id="y">2</a>');
    expect(found.map((link) => link.href)).toEqual(['/uno', '/due']);
  });

  it('reads `&amp;` in an href as the ampersand it is', () => {
    expect(linkTarget('/cerca?a=1&amp;b=2', 'dist/index.html')).toBe('/cerca');
    expect(pageLinks('<a href="/x?a=1&amp;b=2">x</a>')[0]!.href).toBe('/x?a=1&b=2');
  });
});
