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
 *
 * Nothing here is written against the three sample evenings either, and that
 * is the second half of the same idea. Every expectation is derived: the
 * evenings from src/content/eventi, the venue names from src/content/sedi, the
 * date strings from src/lib/events.ts — the module under test, formatting in
 * this process, in whatever zone this machine is in, compared against what a
 * build in UTC published. Written out as literals, adding evening 083 or a
 * second venue or cancelling a night would turn the suite red with nothing
 * broken, and the failure would point at a test instead of at the content.
 * The one literal date left in the suite is in test/unit/timezone.test.ts,
 * over a fixed instant that no editor can reschedule.
 */
import { describe, expect, it } from 'vitest';
import { longDate, noteOf, shortDate, sortByNumber } from '../../src/lib/events.ts';
import { checkMachineDateText } from '../guards/dates.ts';
import { copiedFromPublic, decodeEntities, readPublishedFiles } from '../support/dist.ts';
import { collectionEntries, dateOf } from '../support/frontmatter.ts';
import { read } from '../support/paths.ts';

const home = read('dist/index.html');

/* Evenings are found by `data-number`, an attribute the real scroller will
   carry too — not by the decoration of a page meant to be replaced. */
const marks = [...home.matchAll(/data-number="(\d+)"/g)];

/** The evenings as the content has them, in the order of the site. */
const evenings = sortByNumber(
  collectionEntries('eventi').map((entry) => {
    const speakers = Array.isArray(entry.data.speakers) ? entry.data.speakers : [];
    return {
      number: Number(entry.data.number),
      date: dateOf(entry),
      venue: String(entry.data.venue ?? ''),
      cycle: String(entry.data.cycle ?? ''),
      cancelled: entry.data.cancelled === true,
      note: typeof entry.data.note === 'string' ? entry.data.note : undefined,
      /** The roles an evening overrides on its speakers, if it overrides any. */
      roles: speakers
        .map((speaker) => (speaker as { role?: unknown }).role)
        .filter((role): role is string => typeof role === 'string' && role.trim() !== ''),
    };
  }),
);

/** The name of every venue and of every cycle, by the id the evenings refer to
 *  them with. */
const named = (collection: string): Map<string, string> =>
  new Map(collectionEntries(collection).map((entry) => [entry.id, String(entry.data.name ?? '')]));

const venues = named('sedi');
const cycles = named('cicli');

/** The published markup of one evening: from its own tag to the next one's.
 *
 *  Decoded, because everything compared against it comes from the content and
 *  Astro escapes what it renders: `quarant'anni` is `quarant&#39;anni` in
 *  dist/, and a role or a venue with an apostrophe in it — which is most
 *  Italian — would fail against a page that is perfectly correct. */
function section(number: number): string {
  const at = marks.findIndex((mark) => mark[1] === String(number));
  expect(at, `evening #${number} is not on the page`).toBeGreaterThan(-1);
  return decodeEntities(home.slice(marks[at]!.index, marks[at + 1]?.index));
}

/** The state the page publishes for an evening, read from the attribute it
 *  puts it in. Not from the Italian words: those sit in the same block as the
 *  evening's own description, and a night whose text says «in programma» would
 *  read as two states at once. */
function publishedState(number: number): string {
  const state = /data-state="([a-z]+)"/.exec(section(number));
  expect(state, `evening #${number} publishes no state`).not.toBeNull();
  return state![1]!;
}

describe('the dates published by a build in UTC', () => {
  it('has evenings to check in the first place', () => {
    // Without this every loop below would pass vacuously the day the page
    // stops rendering the programme at all.
    expect(evenings.length).toBeGreaterThan(1);
    expect(marks).toHaveLength(evenings.length);
  });

  it('puts the evenings in the order of their numbers', () => {
    expect(marks.map((mark) => Number(mark[1]))).toEqual(evenings.map((evening) => evening.number));
  });

  it('writes the heading of every scene in Italian, at the Italian hour', () => {
    // 21:00 in Turin is 19:00 UTC. Without the zone the page reads «ore 19»,
    // and nothing else in the suite would notice — the strings on this side
    // are formatted by the same module, but in this process and in this
    // machine's zone, which in CI is UTC and on a desk in Turin is not.
    for (const evening of evenings) {
      const published = section(evening.number);
      expect(published, `evening #${evening.number} has no heading`).toContain(
        longDate(evening.date),
      );
      expect(published, `evening #${evening.number} has no Timeline tick`).toContain(
        shortDate(evening.date),
      );
    }
  });

  it('gives every evening the state its content asks for, and the note that goes with it', () => {
    // The pairing is what proves the page reads its note from the domain
    // instead of writing one. Neither side of it depends on today: which
    // evenings are past is left to the clock, but a cancelled one is cancelled
    // whatever the day, and the note follows from the state either way.
    //
    // No sample evening is cancelled, so that half of the pairing is only
    // asserted here in the negative — and an assertion nobody has seen fail is
    // not one to lean on. The mapping itself is a pure function with its own
    // test, `stateOf` in src/lib/events.ts: what cannot be proved out of dist/
    // without inventing an evening the association never held is proved where
    // it can be.
    for (const evening of evenings) {
      const state = publishedState(evening.number);
      expect(['past', 'upcoming', 'cancelled']).toContain(state);
      expect(state === 'cancelled', `evening #${evening.number} disagrees about being cancelled`)
        .toBe(evening.cancelled);
      expect(section(evening.number)).toContain(
        noteOf({ note: evening.note, cancelled: evening.cancelled }, state === 'past'),
      );
    }
  });

  it('opens on exactly one evening', () => {
    // nextIndex reaches the markup: without this, an index nobody renders
    // would be an index nobody notices is wrong. Read from `data-open` and not
    // from the Italian words this page happens to write next to it: the
    // scroller has to carry the attribute, and CLAUDE.md promises that carrying
    // the three attributes is all it has to do.
    expect([...home.matchAll(/data-open="true"/g)]).toHaveLength(1);
  });

  it('shows the role an evening overrides, not the one on the person', () => {
    // Which evening carries an override is content, not something to write
    // down here; that there is one at all is held by sources.test.ts, and the
    // branch has no other coverage.
    const overriding = evenings.filter((evening) => evening.roles.length > 0);
    expect(overriding.length).toBeGreaterThan(0);

    for (const evening of overriding) {
      const published = section(evening.number);
      for (const role of evening.roles) {
        expect(published, `evening #${evening.number} does not show its own role`).toContain(role);
      }
    }
  });

  it('resolves the references of every evening', () => {
    // The evening's own cycle and its own venue, by name, in its own section: a
    // reference that failed to resolve stops the build, but a field forgotten
    // in the view model would just leave a gap. Both names come from the
    // collections rather than from a shape this page gives them — `Ciclo …` is
    // decoration, and the scroller will write the cycle differently.
    for (const evening of evenings) {
      const published = section(evening.number);
      const venue = venues.get(evening.venue);
      const cycle = cycles.get(evening.cycle);
      expect(venue, `evening #${evening.number} names a venue that is not in src/content/sedi`)
        .toBeTruthy();
      expect(cycle, `evening #${evening.number} names a cycle that is not in src/content/cicli`)
        .toBeTruthy();
      expect(published, `evening #${evening.number} has no cycle`).toContain(cycle!);
      expect(published, `evening #${evening.number} has no venue`).toContain(venue!);
    }
  });

  it("publishes no date in the machine's own words", () => {
    // The hole none of the three source guards can see: a `Date` handed to
    // something that wants a string. It is the same two hours as a missing
    // `timeZone`, arriving by a route no call-shaped check can recognise, and
    // dist/ is where it becomes visible — in English, in a site written in
    // Italian.
    //
    // What is copied out of public/ is left out, as it is for the framework
    // check next door: this asks whether one of *our* dates reached a page as a
    // string, and the Sveltia bundle of PR 14 contains `GMT` because it formats
    // dates in a browser, which is a CMS being a CMS. A guard that fires on
    // correct work is the half somebody switches off.
    const files = readPublishedFiles().filter(({ path }) => !copiedFromPublic(path));
    expect(files.length).toBeGreaterThan(0);

    for (const { path, text } of files) {
      expect(checkMachineDateText(text, path).map((violation) => violation.detail)).toEqual([]);
    }
  });
});
