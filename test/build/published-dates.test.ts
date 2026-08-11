/* What the dates look like once published, from a build that ran in UTC.
 *
 * This is the assertion the whole shape of src/lib/events.ts exists for. The
 * build under test/support/build.ts is run with TZ=UTC — Cloudflare's zone,
 * and the one the tests would never catch on a laptop in Turin, because there
 * a formatter with no `timeZone` gives the right answer for the wrong reason.
 * Out of a machine that has never heard of Italy, the page below has to say
 * «ore 21».
 *
 * Nothing here asserts *which* evening is past. The page is built with the
 * real clock, so «evening 82 is upcoming» would have been true until 8 October
 * 2026 and then turned the suite red on `main` with nobody having touched
 * anything — in a PR whose whole argument is that a boundary reading the clock
 * can only be waited for, not tested. Which evening falls on which side is
 * decided in events.test.ts, where `now` is an argument; what is checked here
 * is that the page goes through the domain at all, and that the strings that
 * do not depend on today are right.
 */
import { describe, expect, it } from 'vitest';
import { read } from '../support/paths.ts';

const home = read('dist/index.html');

/* Evenings are found by `data-number`, an attribute the real scroller will
   carry too — not by the decoration of a page meant to be replaced. */
const marks = [...home.matchAll(/data-number="(\d+)"/g)];

/** The published markup of one evening: from its own tag to the next one's. */
function section(number: number): string {
  const at = marks.findIndex((mark) => mark[1] === String(number));
  expect(at, `evening #${number} is not on the page`).toBeGreaterThan(-1);
  return home.slice(marks[at]!.index, marks[at + 1]?.index);
}

describe('the dates published by a build in UTC', () => {
  it('writes the heading of a scene in Italian, at the Italian hour', () => {
    // 21:00 in Turin is 19:00 UTC. Without the zone this reads «ore 19», and
    // nothing else in the suite would notice.
    expect(home).toContain('giovedì 24 settembre 2026, ore 21');
  });

  it('writes the Timeline tick, year included', () => {
    expect(home).toContain('24 set 2026');
  });

  it('dates the June evening in June, from a machine that thinks in UTC', () => {
    expect(section(78)).toContain('giovedì 18 giugno 2026, ore 21');
  });

  it('gives every evening a state and the note that goes with it', () => {
    // The pairing is what proves the page reads its note from the domain
    // instead of writing one: neither side of it depends on today. No sample
    // evening overrides `note`, so the computed one is what has to appear.
    expect(marks.length).toBeGreaterThan(1);

    for (const mark of marks) {
      const evening = section(Number(mark[1]));
      const past = evening.includes('già svolta');
      const upcoming = evening.includes('in programma');

      expect(past !== upcoming, `evening #${mark[1]} is neither past nor upcoming`).toBe(true);
      expect(evening).toContain(
        past ? 'Puntata registrata in sala' : 'Ingresso libero, posti limitati',
      );
    }
  });

  it('puts the evenings in the order of their numbers', () => {
    expect(marks.map((mark) => Number(mark[1]))).toEqual([78, 81, 82]);
  });

  it('opens on exactly one evening', () => {
    // nextIndex reaches the markup: without this, an index nobody renders
    // would be an index nobody notices is wrong.
    expect([...home.matchAll(/apertura dello scroller/g)]).toHaveLength(1);
  });

  it('shows the role event 81 overrides, not the one on the person', () => {
    expect(section(81)).toContain('coordinatore della portineria di via Cigna');
  });

  it('resolves the references of every evening', () => {
    // A cycle name and a venue in each section: a reference that failed to
    // resolve stops the build, but a field forgotten in the view model would
    // just leave a gap.
    for (const mark of marks) {
      const evening = section(Number(mark[1]));
      expect(evening, `evening #${mark[1]} has no cycle`).toMatch(/Ciclo \S/);
      expect(evening, `evening #${mark[1]} has no venue`).toContain('Palazzo ex Venchi Unica');
    }
  });
});
