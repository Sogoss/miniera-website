/* Guards over the content of the collections.
 *
 * These are editorial rules, not technical ones, and they are here for the
 * same reason as the others: neither of the two defects below breaks anything
 * loudly. A person listed twice renders as two identical rows on the evening's
 * page; a kicker repeating the name of its cycle renders as the same words
 * twice, one line apart. The build is perfectly happy in both cases.
 *
 * They take the parsed frontmatter, not the file: that way a test can hand
 * them a broken event without a broken file having to exist in the repository.
 */
import type { Violation } from './types.ts';

type Speaker = { person?: unknown; role?: unknown };

function speakersOf(data: Record<string, unknown>): Speaker[] {
  const speakers = data.speakers;
  if (!Array.isArray(speakers)) return [];
  return speakers.filter(
    (speaker): speaker is Speaker => typeof speaker === 'object' && speaker !== null,
  );
}

/** Lower case, accents dropped, whitespace collapsed. */
function normalise(text: string): string {
  return text
    .normalize('NFD')
    // Drops the combining marks NFD has just split off, so that a kicker
    // written «Terra di nessuno» still matches a cycle named «Terrà di
    // nessuno» — and, more to the point, so that the comparison does not
    // depend on which of the two ways to encode an accent the editor's
    // keyboard produced.
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The same person must not appear twice among an event's speakers.
 *
 * Where it came from: event 81 listed `amina-belhaj` twice, the second time
 * with a role override — someone reaching for the way to override a role and
 * duplicating the entry instead of adding the second guest. Zod cannot see it:
 * two identical references are two valid references.
 */
export function checkDuplicateSpeakers(
  data: Record<string, unknown>,
  path: string,
): Violation[] {
  const violations: Violation[] = [];
  const seen = new Set<string>();

  for (const speaker of speakersOf(data)) {
    const person = speaker.person;
    if (typeof person !== 'string') continue;
    if (seen.has(person)) {
      violations.push({
        rule: 'content',
        detail: `\`${person}\` is listed twice among the speakers of ${path}: to show a different role for this evening, override \`role\` on the single entry`,
      });
      continue;
    }
    seen.add(person);
  }

  return violations;
}

/**
 * The kicker must not repeat the name of the cycle the event belongs to.
 *
 * The cycle already has its own label in the event header — it comes from the
 * reference, so it is always right and always there. A kicker that says it
 * again spends the one editorial line on the page on a repetition.
 */
export function checkKickerRepeatsCycle(
  data: Record<string, unknown>,
  cycleName: string,
  path: string,
): Violation[] {
  const kicker = data.kicker;
  if (typeof kicker !== 'string' || !cycleName.trim()) return [];

  if (!normalise(kicker).includes(normalise(cycleName))) return [];

  return [
    {
      rule: 'content',
      detail: `the kicker of ${path} repeats the name of its cycle («${cycleName}»): the cycle label is already shown next to it, and it comes from the reference`,
    },
  ];
}
