/* Negative tests for the guards over the addresses of the programme.
 *
 * Both defects are invisible while anybody is looking at the site: an evening
 * with no route of its own only fails when the address it wrote into the bar is
 * reloaded or sent to somebody, and a pushed history entry only fails when the
 * reader presses back — by which time they blame the browser.
 */
import { describe, expect, it } from 'vitest';
import { checkEveningRoutes, checkHistoryPush, publishedNumbers } from '../guards/routes.ts';

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
