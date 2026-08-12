/* What the two child processes of test/unit/timezone.test.ts run.
 *
 * It is a separate file, and a plain one, because the point is the way it is
 * executed: `node test/support/print-dates.ts` under one TZ and then another,
 * with nothing between the module and the machine. Node 24 strips the types
 * itself, which is why src/lib/events.ts is allowed no imports — a single
 * `astro:content` in there, even for a type, and this would not run.
 */
import { isPast, longDate, romeDay, shortDate } from '../../src/lib/events.ts';

/** Event 81: Thursday 24 September 2026, 21:00 in Turin. */
const evening = new Date('2026-09-24T21:00:00+02:00');

console.log(
  JSON.stringify({
    romeDay: romeDay(evening),
    shortDate: shortDate(evening),
    longDate: longDate(evening),
    // 23:59:59 in Turin, then midnight — 22:00Z, two hours before the build
    // machine's own midnight when the machine is in UTC.
    pastJustBefore: isPast(evening, new Date('2026-09-24T21:59:59Z')),
    pastAtMidnight: isPast(evening, new Date('2026-09-24T22:00:00Z')),
  }),
);
