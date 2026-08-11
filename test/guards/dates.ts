/* Two guards over the one thing this site gets wrong silently: what time it
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
 * The second guard keeps `src/lib/events.ts` unable to ask what time it is.
 * That is not tidiness: a boundary that reads the clock can only be waited
 * for, not tested. With `now` in the arguments the two clock changes are four
 * assertions; without it they are two nights a year spent watching.
 *
 * Neither guard strips comments. There is no JavaScript comment stripper in
 * this repository and there is not going to be one — decisioni.md says why,
 * under the comment-language guard that was never written: an extractor that
 * skips strings and regex literals would be the most fragile thing in the
 * suite. What these do instead is ignore a match whose line *begins* as a
 * comment, which is the only way these names appear in prose here — including
 * in the file you are reading. A mention written after code on the same line
 * would trip them, and nobody writes one.
 */
import { type Violation, lineNumber } from './types.ts';

/** Everything that turns an instant into text for a human. `Intl.DateTimeFormat`
 *  is the one this project uses; the three `toLocale…` are the ones that get
 *  reached for absent-mindedly, because they need no formatter. */
const FORMATTERS =
  /\b(Intl\.DateTimeFormat|toLocaleDateString|toLocaleTimeString|toLocaleString)\s*\(/g;

/** The text between the parentheses opening at `open`, quotes respected so a
 *  `)` inside a string does not close the call early. */
function argumentsAt(source: string, open: number): string {
  let depth = 0;
  let quote = '';

  for (let i = open; i < source.length; i++) {
    const character = source[i];
    if (quote) {
      if (character === '\\') i++;
      else if (character === quote) quote = '';
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

  // Unbalanced: the file does not parse anyway, and the guard is not the one
  // that should be saying so.
  return source.slice(open + 1);
}

/** Whether the line holding `index` starts as a comment. See the note above:
 *  a line shape, not a parser. */
function inCommentLine(source: string, index: number): boolean {
  const lineStart = source.lastIndexOf('\n', index - 1) + 1;
  return /^\s*(\/\/|\*|\/\*)/.test(source.slice(lineStart, index));
}

/**
 * Every date formatted in `source` names its time zone.
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
    if (inCommentLine(source, match.index)) continue;

    const call = match[1] ?? '';
    const open = match.index + match[0].length - 1;
    if (/\btimeZone\b/.test(argumentsAt(source, open))) continue;

    violations.push({
      rule: 'rule 11',
      detail: `${path}:${lineNumber(source, match.index)} formats a date with \`${call}\` and no \`timeZone\`: the build machine decides the answer, and on Cloudflare that machine is in UTC — an evening at 21 in Turin publishes as «ore 19», and midnight moves by two hours in summer and one in winter`,
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
 * Pointed at the pure module, not at the whole of `src/`: somewhere the clock
 * has to be read, and that somewhere is `loadProgramme()`, once, with the
 * value passed down from there.
 */
export function checkAmbientTime(source: string, path: string): Violation[] {
  const violations: Violation[] = [];

  for (const { pattern, called } of AMBIENT) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) {
      if (inCommentLine(source, match.index)) continue;
      violations.push({
        rule: 'rule 11',
        detail: `${path}:${lineNumber(source, match.index)} calls \`${called}\`: this module has to stay testable, and a boundary that reads the clock can only be waited for. \`now\` belongs in the arguments — src/lib/programme.ts is the one place that creates it`,
      });
    }
  }

  return violations;
}
