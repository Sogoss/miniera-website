/* The domain, with the clock handed to it.
 *
 * Every `now` below is written in UTC — `…Z` — and never in Italian local
 * time. That is deliberate: the machine that will actually run this code is
 * Cloudflare's, and it is in UTC. An assertion written as `2026-09-25T00:00`
 * would pass on a laptop in Turin for the wrong reason.
 */
import { describe, expect, it } from 'vitest';
import {
  NOTE_CANCELLED,
  NOTE_PAST,
  NOTE_UPCOMING,
  findNumberDateConflicts,
  isPast,
  longDate,
  nextEventIndex,
  noteOf,
  romeDay,
  shortDate,
  sortByNumber,
  speakerRole,
} from '../../src/lib/events.ts';

/** An evening on 24 September 2026, a Thursday, at 21 — the shape of event 81. */
const EVENING = new Date('2026-09-24T21:00:00+02:00');

describe('romeDay', () => {
  it('gives the civil date in Turin, not the one in UTC', () => {
    // 01:30 on the 19th in Rome, still the 18th in UTC. Half an hour that
    // decides which day an evening is filed under.
    expect(romeDay(new Date('2026-06-18T23:30:00Z'))).toBe('2026-06-19');
  });

  it('pads month and day, so two of them compare with <', () => {
    expect(romeDay(new Date('2026-01-08T12:00:00Z'))).toBe('2026-01-08');
  });
});

describe('isPast', () => {
  it('leaves an evening upcoming while it is under way', () => {
    // 22:30 in Turin: the room is full.
    expect(isPast(EVENING, new Date('2026-09-24T20:30:00Z'))).toBe(false);
  });

  it('leaves it upcoming at 23:59 of its own day', () => {
    expect(isPast(EVENING, new Date('2026-09-24T21:59:59Z'))).toBe(false);
  });

  it('files it as past at midnight of the following day, Italian time', () => {
    // 22:00Z *is* midnight in Turin in September. Two hours before the
    // machine's own midnight, which is the whole point.
    expect(isPast(EVENING, new Date('2026-09-24T22:00:00Z'))).toBe(true);
  });

  it('is not past yet at the build machine own midnight the night before', () => {
    expect(isPast(EVENING, new Date('2026-09-24T00:00:00Z'))).toBe(false);
  });

  /* The two clock changes. The boundary is midnight in Turin, so in UTC it
     moves — and the two nights below are 23 and 25 hours apart in UTC while
     being one day apart in Rome. Arithmetic on a fixed offset gets exactly
     these four assertions wrong. */
  describe('across the clock changes', () => {
    it('holds the boundary the night the clocks go forward', () => {
      // Sunday 29 March 2026: the day starts at +01:00 and ends at +02:00.
      const evening = new Date('2026-03-29T21:00:00+02:00');
      expect(isPast(evening, new Date('2026-03-29T21:59:59Z'))).toBe(false);
      expect(isPast(evening, new Date('2026-03-29T22:00:00Z'))).toBe(true);
    });

    it('holds it on the winter evening just before', () => {
      // Saturday 28 March, still +01:00: midnight is an hour later in UTC
      // than it is the following night.
      const evening = new Date('2026-03-28T21:00:00+01:00');
      expect(isPast(evening, new Date('2026-03-28T22:59:59Z'))).toBe(false);
      expect(isPast(evening, new Date('2026-03-28T23:00:00Z'))).toBe(true);
    });

    it('holds the boundary the night the clocks go back', () => {
      // Sunday 25 October 2026, twenty-five hours long.
      const evening = new Date('2026-10-25T21:00:00+01:00');
      expect(isPast(evening, new Date('2026-10-25T22:59:59Z'))).toBe(false);
      expect(isPast(evening, new Date('2026-10-25T23:00:00Z'))).toBe(true);
    });

    it('holds it on the summer evening just before', () => {
      const evening = new Date('2026-10-24T21:00:00+02:00');
      expect(isPast(evening, new Date('2026-10-24T21:59:59Z'))).toBe(false);
      expect(isPast(evening, new Date('2026-10-24T22:00:00Z'))).toBe(true);
    });
  });
});

describe('shortDate and longDate', () => {
  it('writes the Timeline tick', () => {
    expect(shortDate(EVENING)).toBe('24 set 2026');
  });

  it('writes the heading of a scene', () => {
    expect(longDate(EVENING)).toBe('giovedì 24 settembre 2026, ore 21');
  });

  it('shows the minutes only when there are any', () => {
    expect(longDate(new Date('2026-09-24T21:30:00+02:00'))).toBe(
      'giovedì 24 settembre 2026, ore 21:30',
    );
  });

  it('dates the evening by the day it falls on in Turin', () => {
    // 00:30 on 8 January in Turin, 23:30 on the 7th in UTC. Without the time
    // zone both strings would name the wrong day — and the weekday with it.
    // Crossing the UTC date line in winter means an hour past midnight, which
    // no evening of this association ever is: what is asserted here is the
    // date, and the hour is left out of it.
    const afterMidnight = new Date('2026-01-08T00:30:00+01:00');
    expect(shortDate(afterMidnight)).toBe('8 gen 2026');
    expect(longDate(afterMidnight)).toContain('giovedì 8 gennaio 2026');
  });
});

describe('sortByNumber', () => {
  const unsorted = [{ number: 82 }, { number: 78 }, { number: 81 }];

  it('puts the evenings in the order of the site', () => {
    expect(sortByNumber(unsorted).map((event) => event.number)).toEqual([78, 81, 82]);
  });

  it('leaves the array it was given alone', () => {
    sortByNumber(unsorted);
    expect(unsorted.map((event) => event.number)).toEqual([82, 78, 81]);
  });
});

describe('nextEventIndex', () => {
  const now = new Date('2026-08-11T12:00:00Z');
  const programme = [
    { date: new Date('2026-06-18T21:00:00+02:00') }, // past
    { date: new Date('2026-09-24T21:00:00+02:00') }, // next
    { date: new Date('2026-10-08T21:00:00+02:00') },
  ];

  it('opens on the first evening still to come', () => {
    expect(nextEventIndex(programme, now)).toBe(1);
  });

  it('steps over a cancelled evening: it is not an appointment', () => {
    const withCancellation = [
      programme[0]!,
      { ...programme[1]!, cancelled: true },
      programme[2]!,
    ];
    expect(nextEventIndex(withCancellation, now)).toBe(2);
  });

  it('opens on the last evening when they are all behind us', () => {
    // -1 would become an empty opening scene, which is worse than the most
    // recent evening: an association between seasons has nothing else to show.
    expect(nextEventIndex(programme, new Date('2027-01-01T12:00:00Z'))).toBe(2);
  });

  it('steps over a cancelled evening on the way back, too', () => {
    // The fallback used to return the last index whatever it held, which
    // landed on exactly the struck-through scene the line above steps over —
    // and it is the likeliest shape of all: the season ends, the last evening
    // was called off.
    const lastCancelled = [programme[0]!, programme[1]!, { ...programme[2]!, cancelled: true }];
    expect(nextEventIndex(lastCancelled, new Date('2027-01-01T12:00:00Z'))).toBe(1);
  });

  it('gives the last evening when every one of them was cancelled', () => {
    const allCancelled = programme.map((event) => ({ ...event, cancelled: true }));
    expect(nextEventIndex(allCancelled, new Date('2027-01-01T12:00:00Z'))).toBe(2);
  });

  it('has no answer for an empty programme, and says so', () => {
    expect(nextEventIndex([], now)).toBe(-1);
  });
});

describe('speakerRole', () => {
  const person = { role: 'presidente del comitato di quartiere' };

  it('lets the evening override the role of the person', () => {
    expect(speakerRole({ role: 'coordinatore della portineria' }, person)).toBe(
      'coordinatore della portineria',
    );
  });

  it('falls back to the role on the person', () => {
    expect(speakerRole({}, person)).toBe('presidente del comitato di quartiere');
  });

  it('treats an override left blank as no override', () => {
    expect(speakerRole({ role: '   ' }, person)).toBe('presidente del comitato di quartiere');
  });
});

describe('noteOf', () => {
  it('invites to an upcoming evening', () => {
    expect(noteOf({}, false)).toBe(NOTE_UPCOMING);
  });

  it('says a past evening was recorded even with no material linked yet', () => {
    // The recording exists; the links can arrive later. What is missing
    // without them is the button, not the sentence.
    expect(noteOf({}, true)).toBe(NOTE_PAST);
  });

  it('says a cancelled evening was cancelled, past or future', () => {
    expect(noteOf({ cancelled: true }, false)).toBe(NOTE_CANCELLED);
    expect(noteOf({ cancelled: true }, true)).toBe(NOTE_CANCELLED);
  });

  it('lets the file have the last word', () => {
    expect(noteOf({ note: 'Prenotazione obbligatoria' }, false)).toBe(
      'Prenotazione obbligatoria',
    );
    expect(noteOf({ note: 'Rinviata a data da destinarsi', cancelled: true }, false)).toBe(
      'Rinviata a data da destinarsi',
    );
  });
});

describe('findNumberDateConflicts', () => {
  const programme = [
    { number: 78, title: 'Il cinema che guarda i margini', date: new Date('2026-06-18T21:00:00+02:00') },
    { number: 81, title: 'Chi tiene aperto il quartiere', date: new Date('2026-09-24T21:00:00+02:00') },
    { number: 82, title: 'Le case che restano', date: new Date('2026-10-08T21:00:00+02:00') },
  ];

  it('says nothing when the numbers follow the calendar', () => {
    expect(findNumberDateConflicts(programme)).toEqual([]);
  });

  it('finds the pair whose order by number and by date disagree', () => {
    // A year typed wrong in one frontmatter, which is what this looks like
    // from the inside.
    const broken = [
      programme[0]!,
      { ...programme[1]!, date: new Date('2025-09-24T21:00:00+02:00') },
      programme[2]!,
    ];
    const problems = findNumberDateConflicts(broken);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('#78');
    expect(problems[0]).toContain('#81');
  });

  it('finds a number used twice, which no route exists yet to notice', () => {
    const broken = [...programme, { ...programme[2]!, title: 'Un doppione', number: 81 }];
    const problems = findNumberDateConflicts(broken);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('same number');
  });

  it('does not also accuse the duplicate of being out of order', () => {
    // Left in the ordering pass, a second #81 dated in June produced «#81 is
    // numbered before #81 but happens after it» — false on its face, and it
    // sends the editor to check a date that is fine.
    const broken = [
      ...programme,
      { number: 81, title: 'Un doppione', date: new Date('2026-06-01T21:00:00+02:00') },
    ];
    const problems = findNumberDateConflicts(broken);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('same number');
  });

  it('reports a date that cannot be read, and does not die formatting it', () => {
    // The failure this replaces: every comparison with an Invalid Date is
    // false, so the pair looked out of order, and the sentence meant to
    // explain it threw a bare RangeError with no file name in it.
    const broken = [
      programme[0]!,
      { number: 79, title: 'Data sbagliata', date: new Date('2026-13-45') },
      programme[1]!,
    ];
    const problems = findNumberDateConflicts(broken);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('#79');
    expect(problems[0]).toContain('cannot be read');
  });

  it('goes on checking the evenings around an unreadable one', () => {
    const broken = [
      { number: 78, title: 'Prima', date: new Date('nope') },
      { number: 81, title: 'Seconda', date: new Date('2026-09-24T21:00:00+02:00') },
      { number: 82, title: 'Terza', date: new Date('2025-10-08T21:00:00+02:00') },
    ];
    const problems = findNumberDateConflicts(broken);
    expect(problems).toHaveLength(2);
    expect(problems[1]).toContain('numbered before');
  });

  it('allows two evenings on the same day', () => {
    const sameDay = [
      programme[0]!,
      { ...programme[1]!, number: 79, date: programme[0]!.date },
    ];
    expect(findNumberDateConflicts(sameDay)).toEqual([]);
  });

  it('checks the order it is given nothing about', () => {
    // The events arrive in whatever order the loader hands them over: the
    // check sorts by number itself, otherwise it would report every unsorted
    // programme as broken.
    expect(findNumberDateConflicts([...programme].reverse())).toEqual([]);
  });
});
