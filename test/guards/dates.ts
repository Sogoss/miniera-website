/* Three guards over the one thing this site gets wrong silently: what time it
 * is, and where.
 *
 * Cloudflare builds in UTC. The evenings happen in Turin. Between the two
 * there are two hours in summer and one in winter, and nothing in between
 * complains: a date formatted without a `timeZone` renders «ore 19» instead of
 * «ore 21», and an evening under way is already filed as past. It is the same
 * family of defect as the collapsed fallback and the `var()` with no
 * declaration — the page builds, the suite is green, and the site is wrong
 * every night.
 *
 * 1. checkMissingTimeZone: every formatter names a zone, and names the right
 *    one. Checking only that the *word* `timeZone` appeared would let
 *    `timeZone: 'UTC'` through — and `'UTC'` is already written half a dozen
 *    times in this test suite, ready to be copied.
 * 2. checkLocalDateMethods: the `Date` methods that read the machine's zone
 *    with no way to declare another. There is no correct use of them here, so
 *    unlike the formatters they are not checked but forbidden.
 * 3. checkAmbientTime: the pure module cannot ask what time it is. That is not
 *    tidiness — a boundary that reads the clock can only be waited for, not
 *    tested. With `now` in the arguments the two clock changes are four
 *    assertions; without it they are two nights a year spent watching.
 *
 * None of the three strips comments. There is no JavaScript comment stripper
 * in this repository and there is not going to be one — decisioni.md says why,
 * under the comment-language guard that was never written: an extractor that
 * skips strings and regex literals would be the most fragile thing in the
 * suite. What these do instead is recognise the two shapes a comment takes
 * around a match, which is how these names appear in prose here — including in
 * the file you are reading.
 */
import { type Violation, lineNumber } from './types.ts';

/** The only zone this site talks in. */
const ZONE = 'Europe/Rome';

/** Everything that turns an instant into text for a human. `Intl.DateTimeFormat`
 *  is the one this project uses; the three `toLocale…` are the ones that get
 *  reached for absent-mindedly, because they need no formatter. */
const FORMATTERS =
  /\b(Intl\.DateTimeFormat|toLocaleDateString|toLocaleTimeString|toLocaleString)\s*\(/g;

/**
 * The text between the parentheses opening at `open`.
 *
 * Quotes are respected so a `)` inside a string does not close the call early,
 * and comments are skipped so an apostrophe inside one does not open a string
 * that never closes. That is not a hypothetical: `l'ora della serata` written
 * in the arguments of a formatter flipped the quote state, the scan ran off
 * the end of the call, and the guard found the `timeZone` of a *different*
 * formatter further down the file — reporting nothing at all.
 *
 * Unbalanced input returns the empty string rather than the rest of the file:
 * whatever is wrong there, the answer that makes the guard speak up is safer
 * than the one that makes it go quiet.
 */
function argumentsAt(source: string, open: number): string {
  let depth = 0;
  let quote = '';
  let comment: '' | 'line' | 'block' = '';

  for (let i = open; i < source.length; i++) {
    const character = source[i];
    const next = source[i + 1];

    if (comment === 'line') {
      if (character === '\n') comment = '';
      continue;
    }
    if (comment === 'block') {
      if (character === '*' && next === '/') {
        comment = '';
        i++;
      }
      continue;
    }
    if (quote) {
      if (character === '\\') i++;
      else if (character === quote) quote = '';
      continue;
    }

    if (character === '/' && next === '/') {
      comment = 'line';
      i++;
      continue;
    }
    if (character === '/' && next === '*') {
      comment = 'block';
      i++;
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (character === '(') depth++;
    else if (character === ')') {
      depth--;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }

  return '';
}

/** Whether `index` sits inside a comment.
 *
 *  Two shapes, both of them line-and-position work rather than parsing: an
 *  unclosed `/*` before it, and a `//` earlier on its own line. The second
 *  ignores the `//` of a URL, which is the one that turns up in prose. A `/*`
 *  written inside a string would fool it, and no line in this project does
 *  that. */
function inComment(source: string, index: number): boolean {
  const opened = source.lastIndexOf('/*', index);
  if (opened !== -1 && opened > source.lastIndexOf('*/', index)) return true;

  const lineStart = source.lastIndexOf('\n', index - 1) + 1;
  const before = source.slice(lineStart, index);
  return /(^|[^:])\/\//.test(before) || /^\s*\*/.test(before);
}

/** The zone a call declares, and whether it could be worked out at all.
 *  A constant is followed to its declaration — `timeZone: ROME` is how
 *  src/lib/events.ts writes it — and anything less obvious is left alone
 *  rather than guessed at. */
function declaredZone(args: string, source: string): { present: boolean; zone: string | null } {
  const declaration = /\btimeZone\s*:\s*([^,}\n]+)/.exec(args);
  if (!declaration) return { present: false, zone: null };

  const value = (declaration[1] ?? '').trim();
  const literal = /^['"`]([^'"`]*)['"`]$/.exec(value);
  if (literal) return { present: true, zone: literal[1] ?? '' };

  if (/^[A-Za-z_$][\w$]*$/.test(value)) {
    const constant = new RegExp(
      `\\b(?:const|let|var)\\s+${value}\\s*=\\s*['"\`]([^'"\`]*)['"\`]`,
    ).exec(source);
    if (constant) return { present: true, zone: constant[1] ?? '' };
  }

  return { present: true, zone: null };
}

/**
 * Every date formatted in `source` names Europe/Rome.
 *
 * The check is on the arguments of the call, not on the presence of the call:
 * `toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' })` is correct, and a
 * guard that forbade it outright would be switched off the first time somebody
 * legitimately needed it — taking the rest of it along.
 */
export function checkMissingTimeZone(source: string, path: string): Violation[] {
  const violations: Violation[] = [];
  FORMATTERS.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = FORMATTERS.exec(source)) !== null) {
    if (inComment(source, match.index)) continue;

    const call = match[1] ?? '';
    const where = `${path}:${lineNumber(source, match.index)}`;
    const { present, zone } = declaredZone(
      argumentsAt(source, match.index + match[0].length - 1),
      source,
    );

    if (!present) {
      violations.push({
        rule: 'rule 11',
        detail: `${where} formats a date with \`${call}\` and no \`timeZone\`: the build machine decides the answer, and on Cloudflare that machine is in UTC — an evening at 21 in Turin publishes as «ore 19», and midnight moves by two hours in summer and one in winter`,
      });
      continue;
    }

    if (zone !== null && zone !== ZONE) {
      violations.push({
        rule: 'rule 11',
        detail: `${where} formats a date in \`${zone}\` and not in \`${ZONE}\`: the evenings happen in Turin, and «ore 19» is what the reader would get`,
      });
    }
  }

  return violations;
}

/** The `Date` methods that answer in the machine's own zone and take no
 *  option to say otherwise. `getTime` and the `getUTC…` family are not here:
 *  they mean the same thing on every machine. */
const LOCAL_METHODS = [
  'getHours',
  'getMinutes',
  'getSeconds',
  'getDay',
  'getDate',
  'getMonth',
  'getFullYear',
  'toDateString',
  'toTimeString',
];

const LOCAL_CALLS = new RegExp(`\\.(${LOCAL_METHODS.join('|')})\\s*\\(`, 'g');

/**
 * `source` reads no component of a date in the machine's own zone.
 *
 * These have no `timeZone` option, so unlike the formatters there is nothing
 * to check — only to forbid. It is the hole the two-zone test cannot cover on
 * its own: it runs `src/lib/events.ts` and nothing else, so a component
 * working out a weekday with `getDay()` would publish a Thursday evening as
 * Wednesday with the whole suite green.
 */
export function checkLocalDateMethods(source: string, path: string): Violation[] {
  const violations: Violation[] = [];
  LOCAL_CALLS.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = LOCAL_CALLS.exec(source)) !== null) {
    if (inComment(source, match.index)) continue;
    violations.push({
      rule: 'rule 11',
      detail: `${path}:${lineNumber(source, match.index)} calls \`${match[1]}()\`, which answers in the zone of whatever machine is building — UTC, on Cloudflare. There is no option to declare a zone on it: the date strings come from src/lib/events.ts, and what has to be compared instead is \`getTime()\``,
    });
  }

  return violations;
}

const AMBIENT = [
  { pattern: /\bnew\s+Date\s*\(\s*\)/g, called: 'new Date()' },
  { pattern: /\bDate\.now\s*\(\s*\)/g, called: 'Date.now()' },
];

/**
 * `source` does not read the clock.
 *
 * Pointed at the pure modules of `src/lib/`, not at the whole of `src/`:
 * somewhere the clock has to be read, and that somewhere is `loadProgramme()`,
 * once, with the value passed down from there.
 */
export function checkAmbientTime(source: string, path: string): Violation[] {
  const violations: Violation[] = [];

  for (const { pattern, called } of AMBIENT) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) {
      if (inComment(source, match.index)) continue;
      violations.push({
        rule: 'rule 11',
        detail: `${path}:${lineNumber(source, match.index)} calls \`${called}\`: this module has to stay testable, and a boundary that reads the clock can only be waited for. \`now\` belongs in the arguments — src/lib/programme.ts is the one place that creates it`,
      });
    }
  }

  return violations;
}
