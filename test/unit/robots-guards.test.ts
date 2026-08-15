/* checkRobotsIndexing, on both sides of its switch and on the rule that does
 * not flip.
 *
 * The negative cases matter more than usual here: the whole guard exists
 * because the correct content of robots.txt is the *opposite* thing on either
 * side of one line in astro.config.mjs, and a file that is right today is wrong
 * the day the domain arrives — with nothing to say so.
 */
import { describe, expect, it } from 'vitest';
import { checkRobotsIndexing } from '../guards/robots.ts';

const CLOSED = `User-agent: *
Disallow: /
`;

const OPEN = `User-agent: *
Allow: /

Sitemap: https://www.laminieraculturale.it/sitemap-index.xml
`;

describe('checkRobotsIndexing', () => {
  it('accepts a closed file while there is no domain', () => {
    expect(checkRobotsIndexing(CLOSED, { withDomain: false })).toEqual([]);
  });

  it('accepts an open file with a sitemap once there is one', () => {
    expect(checkRobotsIndexing(OPEN, { withDomain: true })).toEqual([]);
  });

  it('reports a file that lets crawlers in before the site has an address', () => {
    // The pages.dev would be indexed, and the day the domain arrives there are
    // two identical sites for a search engine to choose between.
    const violations = checkRobotsIndexing(OPEN, { withDomain: false });
    expect(violations).toHaveLength(1);
    expect(violations[0].detail).toContain('pages.dev');
  });

  it('reports a file that still forbids everything once the domain is set', () => {
    // PR 20 is one line in astro.config.mjs, and this is the file that would
    // otherwise stay shut behind it — a published site nobody can find.
    const violations = checkRobotsIndexing(CLOSED, { withDomain: true });
    expect(violations.map((v) => v.rule)).toEqual(['robots', 'robots']);
    expect(violations[0].detail).toContain('forbids the whole site');
    expect(violations[1].detail).toContain('Sitemap');
  });

  it('reports an open file with no sitemap', () => {
    const violations = checkRobotsIndexing(
      'User-agent: *\nAllow: /\n',
      { withDomain: true },
    );
    expect(violations).toHaveLength(1);
    expect(violations[0].detail).toContain('Sitemap');
  });

  it.each([
    ['/admin', 'Disallow: /admin'],
    ['/admin, with the trailing slash', 'Disallow: /admin/'],
    // `*` is «and anything after», so these forbid the same page by another
    // spelling — and a guard that reads only the bare form is one a rewrite
    // walks past without meaning to.
    ['/admin, with a wildcard', 'Disallow: /admin/*'],
    ['/componenti', 'Disallow: /componenti'],
    ['/componenti, with a wildcard', 'Disallow: /componenti*'],
  ])('reports a Disallow on %s, which keeps it in the index', (_name, line) => {
    // The one that reads backwards: forbidding the crawl means the `noindex`
    // is never read, so the bare address can be listed anyway.
    const violations = checkRobotsIndexing(`User-agent: *\nAllow: /\n${line}\n\nSitemap: https://x/y.xml\n`, {
      withDomain: true,
    });
    expect(violations).toHaveLength(1);
    expect(violations[0].detail).toContain('noindex');
  });

  it('reports those two on the closed side of the switch as well', () => {
    // The rule does not flip with the domain: a `Disallow: /admin` written
    // today survives the inversion of PR 20 and becomes wrong there.
    const violations = checkRobotsIndexing(`${CLOSED}Disallow: /componenti\n`, {
      withDomain: false,
    });
    expect(violations).toHaveLength(1);
    expect(violations[0].detail).toContain('/componenti');
  });

  it('does not read the prose that explains it', () => {
    // A guard that fires on the comment describing it is a guard somebody
    // switches off. `#` starts a comment in robots.txt.
    const commented = `# Alla PR 20 questo file si rovescia. Non scrivere Disallow: /admin qui.\n${CLOSED}`;
    expect(checkRobotsIndexing(commented, { withDomain: false })).toEqual([]);
  });

  it('reads `Disallow: /*` as forbidding everything, like the bare slash', () => {
    // The same line said the other way. Read literally it is not `/`, and the
    // whole switch would then be the wrong way round on both sides at once.
    expect(checkRobotsIndexing('User-agent: *\nDisallow: /*\n', { withDomain: false }))
      .toEqual([]);
    expect(
      checkRobotsIndexing('User-agent: *\nDisallow: /*\n', { withDomain: true }).length,
    ).toBeGreaterThan(0);
  });

  it('does not mistake /componenti-qualcosa for /componenti', () => {
    const violations = checkRobotsIndexing(
      `User-agent: *\nAllow: /\nDisallow: /componenti-interni\n\nSitemap: https://x/y.xml\n`,
      { withDomain: true },
    );
    expect(violations).toEqual([]);
  });
});
