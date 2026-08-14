/* Guards over the addresses of the programme.
 *
 * Every evening is a route, and the address bar names the evening on screen.
 * Both halves of that can break without anything looking wrong.
 *
 * An evening published with no route of its own is a number the script will
 * write into the address bar all the same — and the reader finds out when they
 * reload it or send it to somebody, which is to say never while anyone is
 * looking. `astro dev` makes it worse by serving what a static host would not:
 * only dist/ can answer this.
 *
 * And a history entry pushed instead of replaced is a back button that no
 * longer goes back. Scrolling through forty evenings would leave forty entries,
 * so leaving the site the way one came takes forty presses. The page renders
 * identically either way; the difference is one word.
 */
import { stripMarkupComments } from './language.ts';
import { inComment, maskStrings } from './source.ts';
import { type Violation, lineNumber } from './types.ts';

/** Every `data-number` a page publishes, with where it is. */
export function publishedNumbers(markup: string): { number: string; index: number }[] {
  const pattern = /\sdata-number\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  return [...markup.matchAll(pattern)].map((match) => ({
    number: (match[1] ?? match[2] ?? '').trim(),
    index: match.index,
  }));
}

/**
 * An evening with no address of its own.
 *
 * `routes` is what the build actually produced — the numbers that have a page
 * in dist/ — and not what anybody expects it to have produced. Asked of the
 * published markup for the same reason: the scroller carries every evening on
 * every route, so one missing page is one bad address on all eighty-one of
 * them.
 */
export function checkEveningRoutes(
  markup: string,
  routes: Iterable<string>,
  path = 'the page',
): Violation[] {
  const known = new Set(routes);
  const violations: Violation[] = [];
  const reported = new Set<string>();

  for (const { number, index } of publishedNumbers(markup)) {
    if (number === '' || known.has(number) || reported.has(number)) continue;
    reported.add(number);

    violations.push({
      rule: 'routes',
      detail: `${path}: evening #${number} is published on line ${lineNumber(markup, index)} and \`/${number}\` is not a page in dist/. The script writes that address into the bar as the reader reaches the evening, so what they copy — or reload — is a 404. Nothing shows it while scrolling, which is the only time anybody looks`,
    });
  }

  return violations;
}

/* --- Links that lead somewhere --------------------------------------------- */

/**
 * The markup a link can actually be in.
 *
 * Comments out: a link left commented while something is being tried is not a
 * published link, and a guard that reported it would be reporting work in
 * progress. Script bodies with them, for the reason `checkAnchorsWithoutHref`
 * gives — Astro ships a script verbatim, so `const row = '<a href="/rassegna">'`
 * would be read as a link to a page that is not there, and the guard would fire
 * on every page over a string. Templates stay: a link inside one is a real link
 * in the modal it fills.
 *
 * Blanked and not removed, so every index still points where it did.
 */
function readableMarkup(markup: string): string {
  return stripMarkupComments(markup).replace(
    /<script\b[^>]*>[\s\S]*?<\/script>/gi,
    (block) => block.replace(/[^\n]/g, ' '),
  );
}

/** Every `<a href>` of a page, with where it is. */
export function pageLinks(markup: string): { href: string; index: number }[] {
  const clean = readableMarkup(markup);
  const pattern = /<a\b[^>]*?\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;

  return [...clean.matchAll(pattern)].map((match) => ({
    /* `&amp;` in an href is how a browser writes `&`, not part of the address.
       Only that one: it is the only entity Astro puts into an attribute it
       built, and a general decoder in here would be a second implementation of
       one that already exists in the support layer. */
    href: (match[1] ?? match[2] ?? match[3] ?? '').replace(/&amp;/gi, '&').trim(),
    index: match.index,
  }));
}

/** A path with `.`, `..` and repeated slashes worked out, and no trailing one. */
function tidy(path: string): string {
  const parts: string[] = [];
  for (const step of path.split('/')) {
    if (step === '' || step === '.') continue;
    if (step === '..') parts.pop();
    else parts.push(step);
  }
  return `/${parts.join('/')}`.replace(/(.)\/$/, '$1');
}

/**
 * What a link points at inside this site, or nothing if it points outside it.
 *
 * Everything with a scheme is somebody else's — `mailto:`, `tel:`, `https:` —
 * and so is a protocol-relative `//host/path`. A bare fragment is the page
 * itself, and where those land is `checkTimelineTargets`' business.
 *
 * A relative link is resolved against the page that carries it, which is the
 * only way to tell whether `contatti` written on `/chi-siamo` reaches the
 * contacts page (it does not: it reaches `/chi-siamo/contatti`).
 */
export function linkTarget(href: string, pagePath: string): string | null {
  if (href === '' || href.startsWith('#')) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) return null;

  const address = href.split(/[?#]/)[0] ?? '';
  if (address === '') return null;
  if (address.startsWith('/')) return tidy(address);

  /* `dist/chi-siamo/index.html` is the page `/chi-siamo/`, and a relative link
     is resolved from the directory and not from the file. */
  const directory = pagePath.replace(/^dist\/?/, '/').replace(/[^/]*$/, '');
  return tidy(`${directory}/${address}`);
}

/**
 * A link to a page this build did not produce.
 *
 * The sibling of `checkEveningRoutes`, and the same failure seen from the other
 * end: there the address existed and the page did not, here the link does. A
 * href pointing at nothing is a 404 that shows up only when somebody follows
 * it, which on a navigation that sits on every page of the site is every
 * visitor and never anybody testing.
 *
 * It is also what holds «Rassegna stampa» to being text. There is no page at
 * `/rassegna` — publishing one would be an indexable address with nothing to
 * say — so the day somebody gives that voice an `href`, this is what says the
 * page is not there. The rule does not have to be restated: it falls out of
 * the site not having that page.
 *
 * `routes` is what dist/ actually contains, files and all, so a link to
 * `/favicon.svg` is as legitimate as one to `/81`.
 */
export function checkInternalLinks(
  markup: string,
  routes: Iterable<string>,
  path = 'the page',
): Violation[] {
  const known = new Set([...routes].map((route) => tidy(route)));
  const violations: Violation[] = [];
  const reported = new Set<string>();
  /* Cleaned once and handed on: the line a violation names has to be counted in
     the same text the index came out of, and `readableMarkup` is idempotent —
     what `pageLinks` does to this again is nothing. */
  const clean = readableMarkup(markup);

  for (const { href, index } of pageLinks(clean)) {
    const target = linkTarget(href, path);
    if (target === null || known.has(target) || reported.has(target)) continue;
    reported.add(target);

    violations.push({
      rule: 'routes',
      detail: `${path}: the link on line ${lineNumber(clean, index)} points at \`${href}\`, and \`${target}\` is not in dist/. Nothing about the page says so — a reader finds out by following it, and on a navigation that is every page of the site`,
    });
  }

  return violations;
}

/* `pushState` and nothing else: `replaceState` is the correct call and shares
   most of its name, so the pattern has to end where the word does. */
const PUSH_STATE = /\bhistory\s*\.\s*pushState\b|\bpushState\s*\(/g;

/**
 * A history entry pushed for something that is not navigation.
 *
 * The programme rewrites the address as the reader scrolls, which is what makes
 * a copied link name the evening being read. Pushed instead of replaced, every
 * evening crossed becomes a stop the back button has to walk through — eighty
 * of them between arriving and leaving — and a reader who wanted the page they
 * came from gets the same page again, at a different scroll position.
 *
 * Forbidden outright in `src/`: this site has no client-side routing, so there
 * is nothing here a new history entry could legitimately mark.
 */
export function checkHistoryPush(source: string, path: string): Violation[] {
  const masked = maskStrings(source);
  const violations: Violation[] = [];
  PUSH_STATE.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = PUSH_STATE.exec(source)) !== null) {
    if (masked[match.index] !== source[match.index]) continue;
    if (inComment(masked, match.index)) continue;

    violations.push({
      rule: 'routes',
      detail: `${path}: \`${match[0]}\` on line ${lineNumber(source, match.index)} pushes a history entry. The address of the programme follows the evening on screen, and pushed rather than replaced that is one entry per evening scrolled past: the back button stops leaving the site and starts walking the archive backwards. Use \`history.replaceState\``,
    });
  }

  return violations;
}
