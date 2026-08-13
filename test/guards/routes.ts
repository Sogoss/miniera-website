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
