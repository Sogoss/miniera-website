/* What the dates look like once published, from a build that ran in UTC.
 *
 * This is the assertion the whole shape of src/lib/events.ts exists for. The
 * build under test/support/build.ts is run with TZ=UTC — Cloudflare's zone,
 * and the one the tests would never catch on a laptop in Turin, because there
 * a formatter with no `timeZone` gives the right answer for the wrong reason.
 * Out of a machine that has never heard of Italy, the page below has to say
 * «ore 21» and file the June evening as past.
 */
import { describe, expect, it } from 'vitest';
import { read } from '../support/paths.ts';

const home = read('dist/index.html');

/* Where each evening's markup starts: at the `#78 ·` of its header. The
   separator is part of the pattern because `#` followed by digits is also how
   an escaped apostrophe is published — `quarant&#39;anni` — and the sections
   would be cut inside a description. */
const marks = [...home.matchAll(/#(\d+) ·/g)];

/** The published markup of one evening: from its number to the next one's. */
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

  it('has the June evening behind us and the October one ahead, each with its note', () => {
    // The two sample evenings exist for this: with only event 81 in the
    // repository, half the domain would never be seen running on real
    // content. The slices are between one evening's number and the next, so
    // the assertions are about that evening and not about the page.
    const june = section(78);
    const october = section(82);

    expect(june).toContain('Il cinema che guarda i margini');
    expect(june).toContain('già svolta');
    expect(june).toContain('Puntata registrata in sala');

    expect(october).toContain('Le case che restano');
    expect(october).toContain('in programma');
    expect(october).toContain('Ingresso libero, posti limitati');
  });

  it('puts the evenings in the order of their numbers', () => {
    expect(marks.map((mark) => Number(mark[1]))).toEqual([78, 81, 82]);
  });

  it('shows the role event 81 overrides, not the one on the person', () => {
    expect(home).toContain('coordinatore della portineria di via Cigna');
  });
});
