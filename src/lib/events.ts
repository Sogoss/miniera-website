/* The domain of an evening: the order of the programme, the boundary between
 * past and upcoming, the Italian date strings, the role of a speaker, the note
 * under the title, and the scene the scroller opens on.
 *
 * Two properties hold this file together, and both have a guard:
 *
 * 1. It imports nothing. The shapes it works on are described structurally,
 *    so the module runs under a plain `node src/lib/events.ts` — which is how
 *    the suite proves it answers the same under TZ=UTC and TZ=Europe/Rome.
 *    Not even astro:content is imported for its types: programme.ts is what
 *    hands the real entries over, and that is where the schema and these
 *    shapes are checked against one another.
 * 2. It never asks what time it is. `now` always arrives as an argument,
 *    because a boundary that reads the clock cannot be tested, only waited
 *    for.
 *
 * Cloudflare builds in UTC and the evenings happen in Turin. Every formatter
 * below therefore names Europe/Rome, and `isPast` compares civil dates instead
 * of doing arithmetic on offsets: there is no `+2` written anywhere to get
 * wrong twice a year.
 */

const ROME = 'Europe/Rome';

/** What this module needs of an evening. Everything else it does not name —
 *  the description, the photo, the speakers — travels past it untouched. */
export type EventLike = {
  number: number;
  title: string;
  date: Date;
  cancelled?: boolean | undefined;
  note?: string | undefined;
};

/* --- The civil day in Turin --------------------------------------------- */

const dayFormat = new Intl.DateTimeFormat('it-IT', {
  timeZone: ROME,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPart['type']): string {
  return parts.find((piece) => piece.type === type)?.value ?? '';
}

/**
 * The date an instant falls on in Turin, as `YYYY-MM-DD`.
 *
 * Built from the parts rather than from a formatted string so the result does
 * not depend on how a locale orders or separates its fields. Two of these
 * compare correctly with `<`, which is the whole reason the boundary below
 * needs no offsets.
 */
export function romeDay(instant: Date): string {
  const parts = dayFormat.formatToParts(instant);
  return `${part(parts, 'year')}-${part(parts, 'month')}-${part(parts, 'day')}`;
}

/**
 * An evening is past from midnight of the following day, Italian time — not
 * from its starting hour: while it is under way it still reads as upcoming.
 *
 * Comparing civil days is what makes the two clock changes a non-event. On the
 * night the clocks go forward the boundary is one hour of UTC earlier than the
 * night before, and nothing here has to know: both sides of the comparison
 * were converted by the same formatter, which knows the rules of the zone.
 */
export function isPast(date: Date, now: Date): boolean {
  return romeDay(date) < romeDay(now);
}

/* --- Order --------------------------------------------------------------- */

/**
 * The order of the site is the editorial number, not the date.
 *
 * The number is the identity of an evening — it is its URL, and the
 * association assigns it when scheduling. The date is what everything else is
 * worked out from, but when the two orders contradict each other it is the
 * date that is wrong: see findNumberDateConflicts, which makes the build say
 * so instead of publishing a programme out of order.
 */
export function sortByNumber<T extends { number: number }>(events: readonly T[]): T[] {
  return [...events].sort((a, b) => a.number - b.number);
}

/**
 * The index the scroller opens on: the next evening that will actually take
 * place — not yet past, and not cancelled. A cancellation is not an
 * appointment, and opening on a struck-through scene would be the first thing
 * a visitor sees.
 *
 * With every evening behind us it opens on the most recent one that actually
 * took place — a cancellation is no more an appointment behind us than ahead,
 * and the fallback used to land on exactly the struck-through scene the line
 * above steps over. Only if every evening was cancelled does it give the last
 * one, having nothing better to offer. On an empty programme there is no
 * honest answer and it returns -1.
 *
 * Expects the events already in the order of the site — sortByNumber.
 */
export function nextEventIndex(
  events: readonly { date: Date; cancelled?: boolean | undefined }[],
  now: Date,
): number {
  const next = events.findIndex((event) => !event.cancelled && !isPast(event.date, now));
  if (next !== -1) return next;

  for (let i = events.length - 1; i >= 0; i--) {
    if (!events[i]?.cancelled) return i;
  }

  return events.length - 1;
}

/**
 * Everything the evenings say about themselves that cannot all be true at
 * once: a date that will not read, a number used twice, an order by number
 * that disagrees with the order by date. Returns the problems as sentences —
 * programme.ts turns them into a failed build, because a programme in the
 * wrong order is not something to discover in production.
 *
 * Each defect is reported once and then taken out of the way of the next
 * check. A file with an unreadable date compared no better than a file with a
 * good one — every comparison against an Invalid Date is false, so the pair
 * looked out of order — and the sentence meant to explain it died formatting
 * the date it could not read. A number used twice, left in, was then also
 * reported as «#81 is numbered before #81 but happens after it», which is
 * false on its face and sends the editor to check a date that is fine.
 *
 * The duplicate half will be caught by the routes of PR 9 too — two pages
 * claiming /81 — but nothing sees it before those routes exist.
 *
 * A divergence should not happen: the numbering follows the calendar. If one
 * day it genuinely has to — an evening resurfacing years later and getting a
 * number at the end — that is a decision to record and this check is the one
 * place to relax. Until then it is a year typed wrong in a frontmatter.
 */
export function findNumberDateConflicts(
  events: readonly { number: number; title: string; date: Date }[],
): string[] {
  const problems: string[] = [];
  const byNumber = new Map<number, { number: number; title: string; date: Date }>();
  const comparable: { number: number; title: string; date: Date }[] = [];

  for (const event of sortByNumber(events)) {
    if (Number.isNaN(event.date.getTime())) {
      problems.push(
        `${name(event)} has a date that cannot be read: an evening with no date has no place in the programme, and every comparison with it is false — which would leave the order below looking fine`,
      );
      continue;
    }

    const twin = byNumber.get(event.number);
    if (twin) {
      problems.push(
        `${name(twin)} and ${name(event)} carry the same number: the number is the URL of an evening and identifies it, so one of the two has to change`,
      );
      continue;
    }

    byNumber.set(event.number, event);
    comparable.push(event);
  }

  for (let i = 1; i < comparable.length; i++) {
    const earlier = comparable[i - 1];
    const later = comparable[i];
    if (!earlier || !later) continue;
    if (earlier.date.getTime() <= later.date.getTime()) continue;
    problems.push(
      `${name(earlier)} is numbered before ${name(later)} but happens after it: the number is the order of the site, so the date is what to check first`,
    );
  }

  return problems;
}

/** An evening named the way an editor will recognise it. Tolerant of the
 *  unreadable date, because naming the file is exactly what is needed then:
 *  `romeDay` would throw a bare RangeError with nothing in it. */
function name(event: { number: number; title: string; date: Date }): string {
  const when = Number.isNaN(event.date.getTime()) ? 'unreadable date' : romeDay(event.date);
  return `#${event.number} «${event.title}» (${when})`;
}

/* --- The Italian strings ------------------------------------------------- */

const shortDateFormat = new Intl.DateTimeFormat('it-IT', {
  timeZone: ROME,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const longDateFormat = new Intl.DateTimeFormat('it-IT', {
  timeZone: ROME,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const timeFormat = new Intl.DateTimeFormat('it-IT', {
  timeZone: ROME,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** `24 set 2026` — the Timeline tick. */
export function shortDate(date: Date): string {
  return shortDateFormat.format(date);
}

/** `giovedì 24 settembre 2026, ore 21` — the heading of a scene.
 *
 *  The year is there on purpose, and it is not in the design: the design
 *  showed six evenings inside one season, where «18 giugno» identifies
 *  something. Across eighty-one of them it does not.
 */
export function longDate(date: Date): string {
  return `${longDateFormat.format(date)}, ore ${romeTime(date)}`;
}

/** `21`, or `21:30` when the evening does not start on the hour. */
function romeTime(date: Date): string {
  const parts = timeFormat.formatToParts(date);
  const hour = Number(part(parts, 'hour'));
  const minute = part(parts, 'minute');
  return minute === '00' ? String(hour) : `${hour}:${minute}`;
}

/* --- Speakers ------------------------------------------------------------ */

/**
 * The role an evening shows for one of its speakers.
 *
 * The default lives on the person; a single event overrides it, because a role
 * changes over time and an evening from 2025 has to show the one held back
 * then. The event wins — writing the precedence the other way round would look
 * identical on any evening that does not override, which is why one of the
 * sample evenings does.
 */
export function speakerRole(
  speaker: { role?: string | undefined },
  person: { role: string },
): string {
  return speaker.role?.trim() || person.role;
}

/* --- The note under the title -------------------------------------------- */

export const NOTE_CANCELLED = 'Serata annullata';
export const NOTE_PAST = 'Puntata registrata in sala';
export const NOTE_UPCOMING = 'Ingresso libero, posti limitati';

/**
 * The note an evening carries, computed unless the file writes one.
 *
 * A past evening says it was recorded whether or not the links are in yet: the
 * recording exists, the material can arrive later. What the missing links do
 * take away is the button, not the sentence.
 */
export function noteOf(
  event: { note?: string | undefined; cancelled?: boolean | undefined },
  past: boolean,
): string {
  const written = event.note?.trim();
  if (written) return written;
  if (event.cancelled) return NOTE_CANCELLED;
  return past ? NOTE_PAST : NOTE_UPCOMING;
}
