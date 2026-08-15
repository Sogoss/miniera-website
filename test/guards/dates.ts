/* Four guards over the one thing this site gets wrong silently: what time it
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
 * 4. checkMachineDateText: the published text carries no date written in the
 *    machine's own words. The three above read calls; this one reads the
 *    answer, and it is the only thing that sees a `Date` that reached the
 *    markup by being turned into a string — `{scene.date}` in a template calls
 *    `toString()`, which no call-shaped guard can tell from any other.
 *
 * None of the four strips comments from a file. There is no JavaScript comment
 * stripper in this repository and there is not going to be one — decisioni.md
 * says why, under the comment-language guard that was never written: an
 * extractor that skips strings and regex literals would be the most fragile
 * thing in the suite. What these do instead is recognise the two shapes a
 * comment takes around a match, which is how these names appear in prose here
 * — including in the file you are reading. Inside the arguments of one call,
 * where the scan is already walking character by character, the comments are
 * blanked out: see argumentsAt. And what the *strings* of a file contain is
 * blanked before any of that — see maskStrings, which is there because
 * the glob of a content collection reads as an open comment and switched three
 * guards off.
 */
import { inComment, maskStrings } from './source.ts';
import { type Violation, lineNumber } from './types.ts';

/** The only zone this site talks in. */
const ZONE = 'Europe/Rome';

/** Everything that turns an instant into text for a human. `Intl.DateTimeFormat`
 *  is the one this project uses; the three `toLocale…` are the ones that get
 *  reached for absent-mindedly, because they need no formatter. */
const FORMATTERS =
  /\b(Intl\.DateTimeFormat|toLocaleDateString|toLocaleTimeString|toLocaleString)\s*\(/g;

/**
 * The text between the parentheses opening at `open`, with the comments blanked
 * out.
 *
 * Quotes are respected so a `)` inside a string does not close the call early,
 * and comments are skipped so an apostrophe inside one does not open a string
 * that never closes. That is not a hypothetical: `l'ora della serata` written
 * in the arguments of a formatter flipped the quote state, the scan ran off
 * the end of the call, and the guard found the `timeZone` of a *different*
 * formatter further down the file — reporting nothing at all.
 *
 * Skipping them is not enough, though, and returning the span verbatim was the
 * same guard failing open the other way round: `// timeZone: 'Europe/Rome'`
 * commented out while debugging answered for a call that declares nothing, and
 * the suite stayed green while the site published «ore 19». What is returned is
 * therefore the arguments with every comment replaced by spaces — newlines
 * kept, so that a `timeZone` further down still lands on its own line.
 *
 * Unbalanced input returns the empty string rather than the rest of the file:
 * whatever is wrong there, the answer that makes the guard speak up is safer
 * than the one that makes it go quiet.
 */
function argumentsAt(source: string, open: number): string {
  let depth = 0;
  let quote = '';
  let comment: '' | 'line' | 'block' = '';
  const text: string[] = [];

  /** A comment character kept as itself only when it is a newline. */
  const blank = (character: string): string => (character === '\n' ? '\n' : ' ');

  for (let i = open; i < source.length; i++) {
    const character = source[i] ?? '';
    const next = source[i + 1];
    // The opening parenthesis itself is not part of the arguments.
    const inside = i > open;

    if (comment === 'line') {
      if (character === '\n') comment = '';
      if (inside) text.push(blank(character));
      continue;
    }
    if (comment === 'block') {
      if (character === '*' && next === '/') {
        comment = '';
        if (inside) text.push('  ');
        i++;
        continue;
      }
      if (inside) text.push(blank(character));
      continue;
    }
    if (quote) {
      if (character === '\\') {
        if (inside) text.push(character, source[i + 1] ?? '');
        i++;
        continue;
      }
      if (character === quote) quote = '';
      if (inside) text.push(character);
      continue;
    }

    if (character === '/' && next === '/') {
      comment = 'line';
      if (inside) text.push('  ');
      i++;
      continue;
    }
    if (character === '/' && next === '*') {
      comment = 'block';
      if (inside) text.push('  ');
      i++;
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      if (inside) text.push(character);
      continue;
    }
    if (character === '(') depth++;
    else if (character === ')') {
      depth--;
      if (depth === 0) return text.join('');
    }
    if (inside) text.push(character);
  }

  return '';
}

/** The zone a call declares, and whether it could be worked out at all.
 *
 *  A constant is followed to its declaration — `timeZone: ROME` is how
 *  src/lib/events.ts writes it — and anything less obvious is left alone
 *  rather than guessed at.
 *
 *  A constant that has no declaration *in this file* is the case in between,
 *  and it comes back as `unresolved`. The guards read one file at a time, so an
 *  imported `ZONE` could hold `'UTC'` as easily as `'Europe/Rome'` and nothing
 *  here would ever see which — and exporting the constant from events.ts is the
 *  first thing anyone will want the day a component needs it too. Reported
 *  rather than waved through: an identifier is a name somebody chose, unlike an
 *  expression, so asking for it to be readable from here costs one line and
 *  cannot fire on correct work that has nowhere else to go. */
function declaredZone(
  args: string,
  source: string,
): { present: boolean; zone: string | null; unresolved: string | null } {
  const declaration = /\btimeZone\s*:\s*([^,}\n]+)/.exec(args);
  if (!declaration) return { present: false, zone: null, unresolved: null };

  const value = (declaration[1] ?? '').trim();
  const literal = /^['"`]([^'"`]*)['"`]$/.exec(value);
  if (literal) return { present: true, zone: literal[1] ?? '', unresolved: null };

  if (/^[A-Za-z_$][\w$]*$/.test(value)) {
    const constant = new RegExp(
      `\\b(?:const|let|var)\\s+${value}\\s*=\\s*['"\`]([^'"\`]*)['"\`]`,
    ).exec(source);
    if (constant) return { present: true, zone: constant[1] ?? '', unresolved: null };
    return { present: true, zone: null, unresolved: value };
  }

  return { present: true, zone: null, unresolved: null };
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
  const masked = maskStrings(source);
  FORMATTERS.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = FORMATTERS.exec(source)) !== null) {
    if (inComment(masked, match.index)) continue;

    const call = match[1] ?? '';
    const where = `${path}:${lineNumber(source, match.index)}`;
    const { present, zone, unresolved } = declaredZone(
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

    if (unresolved) {
      violations.push({
        rule: 'rule 11',
        detail: `${where} formats a date in \`${unresolved}\`, a constant declared nowhere in this file: the guard reads one file at a time and cannot follow it out — imported from elsewhere it would hold \`'UTC'\` as readily as \`'${ZONE}'\`, and no test in the suite would see which. Write the zone as a literal here, or declare the constant in this file the way src/lib/events.ts does`,
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
  const masked = maskStrings(source);
  LOCAL_CALLS.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = LOCAL_CALLS.exec(source)) !== null) {
    if (inComment(masked, match.index)) continue;
    violations.push({
      rule: 'rule 11',
      detail: `${path}:${lineNumber(source, match.index)} calls \`${match[1]}()\`, which answers in the zone of whatever machine is building — UTC, on Cloudflare. There is no option to declare a zone on it: the date strings come from src/lib/events.ts, and what has to be compared instead is \`getTime()\``,
    });
  }

  return violations;
}

const WEEKDAY = 'Mon|Tue|Wed|Thu|Fri|Sat|Sun';
const MONTH = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec';

/* A date as the `Date` methods that write English write it. Separate patterns
   rather than one, because each arrives alone: `toDateString()` has no offset,
   `toTimeString()` has no weekday, and `toUTCString()` — `Thu, 24 Sep 2026
   19:00:00 GMT` — has a comma, the day before the month and a bare `GMT`, so
   nothing written for `toString()` matches a character of it. That last one is
   the shape a `datetime` attribute gets written in by hand, and it is two hours
   early in exactly the same way. */
const MACHINE_DATE_TEXT = [
  {
    pattern: new RegExp(`\\b(?:${WEEKDAY}) (?:${MONTH}) \\d{2} \\d{4}\\b`, 'g'),
    what: 'a date in English, in the shape `Thu Sep 24 2026`',
  },
  {
    pattern: new RegExp(`\\b(?:${WEEKDAY}), \\d{2} (?:${MONTH}) \\d{4}\\b`, 'g'),
    what: 'a date in English, in the shape `Thu, 24 Sep 2026`',
  },
  { pattern: /\bGMT(?:[+-]\d{4})?\b/g, what: 'the offset of the build machine, `GMT+0200`' },
];

/**
 * The published text carries no date written in the machine's own words.
 *
 * The other three guards read the shape of a call, and there is one way past
 * all of them: handing a `Date` to something that wants a string.
 * `{scene.date}` in a template, `<time datetime={scene.date}>`, `${event.date}`
 * — every one of them calls `toString()`, which is not a formatter, is not in
 * LOCAL_METHODS, and cannot be told apart from any other `toString` by reading
 * the source. It answers in the zone and the language of whoever is building:
 * «Thu Sep 24 2026 21:00:00 GMT+0200» on a laptop in Turin, «19:00:00 GMT+0000»
 * out of Cloudflare — English, in a site that is written in Italian, published
 * two hours early.
 *
 * So this one is pointed at the answer instead of at the call: whatever the
 * route, the result reaches dist/ looking like nothing this site would write.
 * The two-zone test cannot cover it — it runs src/lib/events.ts and nothing
 * else — and neither can a build in one zone, which is why the check is on the
 * shape of the string rather than on which hour it names.
 */
export function checkMachineDateText(text: string, path: string): Violation[] {
  const violations: Violation[] = [];

  for (const { pattern, what } of MACHINE_DATE_TEXT) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      violations.push({
        rule: 'rule 11',
        detail: `${path}:${lineNumber(text, match.index)} publishes \`${match[0]}\` — ${what}: a \`Date\` reached the page as a string instead of going through src/lib/events.ts, and what it says is the zone and the language of the machine that built it`,
      });
    }
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
  const masked = maskStrings(source);

  for (const { pattern, called } of AMBIENT) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) {
      if (inComment(masked, match.index)) continue;
      violations.push({
        rule: 'rule 11',
        detail: `${path}:${lineNumber(source, match.index)} calls \`${called}\`: this module has to stay testable, and a boundary that reads the clock can only be waited for. \`now\` belongs in the arguments — src/lib/programme.ts is the one place that creates it`,
      });
    }
  }

  return violations;
}

/* The offsets Italy has, in hours ahead of UTC: CET in winter, CEST in summer.
   Written out rather than computed, because computing them needs a date and
   the question here has none — it is asked of every night of the year at once. */
const ITALIAN_OFFSETS = [1, 2];

/** The hours of the Italian morning a rebuild may land in.
 *
 *  The lower bound is the requirement: past midnight, because midnight in Turin
 *  is when an evening changes side, and a build before it publishes yesterday's
 *  programme for a whole day. The upper one is a judgement — by six in the
 *  morning nobody has looked at the site yet, and a build later than that is a
 *  window in which the first readers of the day get the stale answer. */
const EARLIEST = 0;
const LATEST = 6;

/**
 * The nightly rebuild happens after Italian midnight, in both seasons.
 *
 * GitHub runs `schedule` in UTC and says so nowhere near the file. `0 22 * * *`
 * is a perfectly ordinary-looking line that means 23:00 in Turin in winter —
 * before midnight, so the build that was supposed to move an evening into the
 * past runs while it is still today, and the site says «in programma» about an
 * evening that happened last night. Nothing fails: it is rule 11 again, one
 * layer out of the code, where no formatter can be asked to name a zone.
 *
 * Reads the cron lines out of the workflow text rather than being told them,
 * for the reason every expectation here is derived: a copy written in a test
 * answers a question about the test.
 */
export function checkRebuildSchedule(workflow: string, path = 'the workflow'): Violation[] {
  const violations: Violation[] = [];
  const crons = [...workflow.matchAll(/^\s*-\s*cron:\s*['"]([^'"]+)['"]/gm)];

  if (crons.length === 0) {
    violations.push({
      rule: 'dates',
      detail: `${path} declares no \`cron\`: nothing rebuilds the site at night, and a static site that is never rebuilt goes on publishing the day it was built. Pages has no scheduler of its own — this file is the clock`,
    });
    return violations;
  }

  for (const cron of crons) {
    const fields = cron[1]!.trim().split(/\s+/);
    const hour = Number(fields[1]);

    if (fields.length !== 5 || !Number.isInteger(hour)) {
      violations.push({
        rule: 'dates',
        detail: `${path}:${lineNumber(workflow, cron.index)} has \`${cron[1]}\`, whose hour field cannot be read as a single hour. A rebuild on a schedule nobody can work out is one nobody can say is after Italian midnight`,
      });
      continue;
    }

    for (const offset of ITALIAN_OFFSETS) {
      const local = (hour + offset) % 24;
      if (local >= EARLIEST && local < LATEST) continue;

      violations.push({
        rule: 'dates',
        detail: `${path}:${lineNumber(workflow, cron.index)} runs at ${String(hour).padStart(2, '0')}:00 UTC, which is ${String(local).padStart(2, '0')}:00 in Turin at UTC+${offset}. GitHub schedules in UTC and the site changes an evening's side at Italian midnight, so a rebuild has to land between 00:00 and 0${LATEST}:00 there — in **both** seasons, or it is right for half the year`,
      });
    }
  }

  return violations;
}
