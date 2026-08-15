/* What `public/robots.txt` is allowed to say, and it depends on one thing.
 *
 * Until the domain exists the site lives on a `pages.dev` address, which is
 * public and crawlable — deploy previews Cloudflare marks itself, production
 * ones it does not. The day the domain arrives there would be two identical
 * sites with a search engine picking one, and the one it picked would be the
 * one nobody links to. So: no domain, no indexing; domain, indexing plus the
 * sitemap. It is the switch of `og:url` and of `checkNoPlaceholders`, pointed
 * at a third thing, and it is read from the configuration rather than
 * remembered — see PR 17 and PR 20.
 *
 * And a second rule that does not flip, because it is the one that is easy to
 * get backwards: **`/admin` and `/componenti` are never `Disallow`ed.** A
 * `Disallow` does not remove an address from an index — it tells the crawler
 * not to *read* the page, and a page that is never read is a page whose
 * `noindex` is never seen, so the bare URL can be listed anyway. Both pages
 * already carry `noindex` (the gallery from PR 6, the editing desk from
 * PR 14), and that is the mechanism that works; forbidding them here would
 * switch it off. Today it changes nothing, because `Disallow: /` covers
 * everything. It changes at PR 20, which is the moment the defect would be
 * published — which is why it is written down now, while somebody is looking.
 */
import { type Violation } from './types.ts';

/** The two addresses that stay out of the index by `noindex`, not by robots. */
export const NOINDEX_PATHS = ['/admin', '/componenti'] as const;

/** A `Disallow` line, with what it forbids. Comments do not count: a guard that
 *  reports the prose explaining it is a guard somebody switches off. */
function disallowedPaths(robots: string): string[] {
  return robots
    .split('\n')
    .map((line) => line.replace(/#.*$/, '').trim())
    .filter((line) => /^disallow\s*:/i.test(line))
    .map((line) => line.replace(/^disallow\s*:/i, '').trim());
}

/** Whether the file forbids the whole site to everybody. */
function forbidsEverything(robots: string): boolean {
  return disallowedPaths(robots).includes('/');
}

function hasSitemap(robots: string): boolean {
  return robots
    .split('\n')
    .map((line) => line.replace(/#.*$/, '').trim())
    .some((line) => /^sitemap\s*:\s*\S+/i.test(line));
}

/**
 * `robots.txt` against the one fact that decides what it should say.
 *
 * `withDomain` is `Boolean(astroConfig.site)`, passed in rather than read here:
 * a guard is a pure function, and the build layer is what knows the
 * configuration — the same arrangement `checkOpenGraph` uses.
 */
export function checkRobotsIndexing(
  robots: string,
  options: { withDomain: boolean },
  path = 'public/robots.txt',
): Violation[] {
  const violations: Violation[] = [];
  const blanket = forbidsEverything(robots);

  if (options.withDomain && blanket) {
    violations.push({
      rule: 'robots',
      detail: `${path} still forbids the whole site with \`Disallow: /\`, and \`site\` is set in astro.config.mjs: the domain is here and the site is telling every search engine to stay out. This is the other side of the switch — see PR 20`,
    });
  }

  if (!options.withDomain && !blanket) {
    violations.push({
      rule: 'robots',
      detail: `${path} does not forbid indexing and there is no \`site\` in astro.config.mjs yet: the site is on a pages.dev address, which is public and crawlable, and the day the domain arrives there would be two identical sites for a search engine to choose between`,
    });
  }

  if (options.withDomain && !hasSitemap(robots)) {
    violations.push({
      rule: 'robots',
      detail: `${path} allows indexing and names no \`Sitemap:\`. The sitemap arrives with the domain, in the same step: a crawler that has to find eighty-one evenings by following links will find the ones the Timeline reaches and stop`,
    });
  }

  for (const forbidden of NOINDEX_PATHS) {
    const listed = disallowedPaths(robots).find(
      (rule) => rule !== '/' && rule.replace(/\/$/, '') === forbidden,
    );

    if (listed !== undefined) {
      violations.push({
        rule: 'robots',
        detail: `${path} forbids \`${listed}\`, and that keeps it in the index rather than out of it: a crawler told not to read the page never sees the \`noindex\` it carries, and can list the bare address anyway. ${forbidden} stays out by its \`noindex\` — the sitemap of PR 20 is the other half, and this line is neither`,
      });
    }
  }

  return violations;
}
