/* The impure half of the domain: the collections read, the references
 * resolved, the strings computed once for whoever renders them.
 *
 * Everything that cannot be a pure function lives here and nowhere else — the
 * `new Date()` that says what today is, the four `getCollection` calls, and
 * the build that fails when the evenings contradict each other. The scroller
 * of PR 7 and the evening pages of PR 9 both start from `loadProgramme()`,
 * so a scene is assembled once and read twice.
 */
import { getCollection, getEntry } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import {
  findNumberDateConflicts,
  isPast,
  longDate,
  nextEventIndex,
  noteOf,
  shortDate,
  sortByNumber,
  speakerRole,
} from './events.ts';

type EventData = CollectionEntry<'eventi'>['data'];
type PersonData = CollectionEntry<'relatori'>['data'];

export type Speaker = {
  name: string;
  /** The person's role, or the one this evening overrides it with. */
  role: string;
  photo: PersonData['photo'];
};

/** An evening with everything a page needs to render it, and nothing left to
 *  resolve or format. */
export type Scene = {
  number: number;
  title: string;
  kicker: string | undefined;
  format: EventData['format'];
  description: string;
  date: Date;
  /** `24 set 2026` */
  shortDate: string;
  /** `giovedì 24 settembre 2026, ore 21` */
  longDate: string;
  past: boolean;
  cancelled: boolean;
  note: string;
  attendance: number | undefined;
  materials: EventData['materials'];
  photo: EventData['photo'];
  cycle: CollectionEntry<'cicli'>['data'];
  venue: CollectionEntry<'sedi'>['data'];
  speakers: Speaker[];
};

export type Programme = {
  /** In the order of the site, which is the editorial number. */
  scenes: Scene[];
  /** Where the scroller opens: the next evening that will take place. */
  nextIndex: number;
};

/**
 * What time it is, read once for the whole build.
 *
 * At module scope and not in the default of the parameter below, which is
 * evaluated at every call: `loadProgramme()` is called once per page, and the
 * pages of one build are rendered over several seconds. A build that started at
 * 23:59:59 would classify an evening as upcoming on the home page and as past
 * on its own page a second later — a site contradicting itself about the same
 * evening, published with nothing failing. The module is loaded once per
 * process, so this is read once, and every page of a build reasons about the
 * same day.
 *
 * In `astro dev` it means the day is the one the server was started on. That is
 * the right trade: a dev server left running across midnight shows a stale
 * label until it restarts, and nothing it renders is published.
 */
const BUILD_TIME = new Date();

/**
 * The whole programme, ready to render.
 *
 * `now` is a parameter so that a test can hand it a different day; the default
 * is the one clock read above, and the only one in the codebase. The value is
 * passed down from here, so that a build straddling midnight cannot classify
 * the first evening against one day and the last against the next.
 */
export async function loadProgramme(now: Date = BUILD_TIME): Promise<Programme> {
  const events = sortByNumber((await getCollection('eventi')).map((entry) => entry.data));

  const conflicts = findNumberDateConflicts(events);
  if (conflicts.length > 0) {
    // Failing the build is the point: an out-of-order programme is not a
    // defect anyone would notice on a page that renders perfectly well.
    throw new Error(
      `The evenings in src/content/eventi/ contradict themselves:\n- ${conflicts.join('\n- ')}`,
    );
  }

  const scenes = await Promise.all(events.map((event) => toScene(event, now)));
  return { scenes, nextIndex: nextEventIndex(scenes, now) };
}

async function toScene(event: EventData, now: Date): Promise<Scene> {
  const cycle = await getEntry(event.cycle);
  if (!cycle) throw new Error(missing(event, 'cycle', event.cycle.id, 'src/content/cicli/'));

  const venue = await getEntry(event.venue);
  if (!venue) throw new Error(missing(event, 'venue', event.venue.id, 'src/content/sedi/'));

  const speakers = await Promise.all(
    event.speakers.map(async (speaker) => {
      const person = await getEntry(speaker.person);
      if (!person) {
        throw new Error(missing(event, 'speaker', speaker.person.id, 'src/content/relatori/'));
      }
      return {
        name: person.data.name,
        role: speakerRole(speaker, person.data),
        photo: person.data.photo,
      };
    }),
  );

  const past = isPast(event.date, now);

  return {
    number: event.number,
    title: event.title,
    kicker: event.kicker,
    format: event.format,
    description: event.description,
    date: event.date,
    shortDate: shortDate(event.date),
    longDate: longDate(event.date),
    past,
    cancelled: event.cancelled,
    note: noteOf(event, past),
    attendance: event.attendance,
    materials: event.materials,
    photo: event.photo,
    cycle: cycle.data,
    venue: venue.data,
    speakers,
  };
}

/* A reference that does not resolve is a build failure with a file name in it,
   not an `undefined` travelling down into the markup: there it would render as
   a missing cycle name, an accent stuck on the default, and no error
   anywhere. */
function missing(event: EventData, field: string, id: string, folder: string): string {
  return `evening #${event.number} («${event.title}») names the ${field} \`${id}\`, which is not in ${folder}`;
}
