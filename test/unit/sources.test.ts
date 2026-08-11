/* The same guards, run against the real source files.
 *
 * This is the positive half: the fixtures next door prove the guards can
 * fail, these prove the repository currently passes them.
 */
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  checkDuplicateDeclarations,
  checkNoColorMixOrOklch,
  checkRgbTriples,
  checkSceneHeightFallback,
  checkUndefinedCustomProperties,
} from '../guards/css.ts';
import {
  checkDuplicateSpeakers,
  checkKickerRepeatsCycle,
} from '../guards/content.ts';
import {
  checkAmbientTime,
  checkLocalDateMethods,
  checkMissingTimeZone,
} from '../guards/dates.ts';
import { findNumberDateConflicts } from '../../src/lib/events.ts';
import { checkDisplayFontWeightRange } from '../guards/fonts.ts';
import {
  checkItalianCustomProperties,
  checkItalianDataAttributes,
} from '../guards/language.ts';
import { checkDevDepsInLockfile, checkNoTailwind } from '../guards/packages.ts';
import { collectionEntries, dateOf } from '../support/frontmatter.ts';
import { filesWithExtension, read, readJson, repoRoot } from '../support/paths.ts';
import { componentCss } from '../support/styles.ts';

const styleFiles = filesWithExtension(join(repoRoot, 'src/styles'), ['.css']);
const astroFiles = filesWithExtension(join(repoRoot, 'src'), ['.astro']);
/* Everything in src/ that can format a date: the modules and the frontmatter
   of the components. */
const codeFiles = filesWithExtension(join(repoRoot, 'src'), ['.ts', '.astro']);

/* The one file allowed to read the clock, and the pure modules that are not.
   A list built from the folder, not a path written by hand: the second pure
   module under src/lib/ has to arrive guarded. */
const CLOCK_HOLDER = 'src/lib/programme.ts';
const pureModules = filesWithExtension(join(repoRoot, 'src/lib'), ['.ts']).filter(
  (path) => path !== CLOCK_HOLDER,
);

/* All the CSS the source has to offer, in one string: the stylesheets, the
   <style> blocks of the components, and the inline `style` attributes — which
   is where the temporary page keeps every token it reads.
   checkUndefinedCustomProperties needs it whole: the tokens are declared in
   one file and read from another, so file by file every one of them would look
   undefined. */
const allSourceCss = [
  ...styleFiles.map((path) => read(path)),
  ...astroFiles.map((path) => componentCss(read(path))),
].join('\n');

describe('src/styles', () => {
  it('has stylesheets to check in the first place', () => {
    // Without this the loops below would pass vacuously the day someone moves
    // the folder.
    expect(styleFiles.length).toBeGreaterThan(0);
  });

  it.each(styleFiles)('%s uses neither color-mix() nor oklch()', (path) => {
    expect(checkNoColorMixOrOklch(read(path))).toEqual([]);
  });

  it.each(styleFiles)('%s declares no property twice in one block', (path) => {
    expect(checkDuplicateDeclarations(read(path))).toEqual([]);
  });

  it.each(styleFiles)('%s names its custom properties in English', (path) => {
    expect(checkItalianCustomProperties(read(path), path)).toEqual([]);
  });

});

/* The tokens read across the whole source at once.
 *
 * Its own block because it is the only check here that cannot be made file by
 * file: the tokens are declared in src/styles and read from the components, so
 * one file at a time every one of them would look undefined. */
describe('all the source CSS together', () => {
  it('is not empty', () => {
    expect(allSourceCss).toContain('var(--');
  });

  it('reads no custom property that is declared nowhere', () => {
    // The half of a rename nothing else notices: `astro check` has no opinion
    // about CSS, the build succeeds, and the property resolves to nothing.
    expect(checkUndefinedCustomProperties(allSourceCss)).toEqual([]);
  });
});

/* The component styles, which dist/ cannot speak for.
 *
 * Rule 4 is the reason this block exists. A double declaration written in a
 * component's <style> is collapsed by the minifier before it reaches dist/, so
 * the build layer cannot see it even in principle — the source is the only
 * place the evidence survives. Rule 3 is checked here as well, though there
 * the build layer does carry it: `oklch()` and any `color-mix()` over a
 * `var()` both reach dist/ intact.
 *
 * All three read `componentCss`: the <style> blocks and the inline `style`
 * attributes together. Reading only the blocks left the attributes exempt from
 * rule 3 and rule 4 — and an attribute is where the temporary page keeps every
 * token it reads, and where the scroller will set the accent of each scene.
 */
describe('src/**/*.astro component styles', () => {
  it('has .astro files to check in the first place', () => {
    expect(astroFiles.length).toBeGreaterThan(0);
  });

  it.each(astroFiles)('%s uses neither color-mix() nor oklch()', (path) => {
    expect(checkNoColorMixOrOklch(componentCss(read(path)))).toEqual([]);
  });

  it.each(astroFiles)('%s declares no property twice in one block', (path) => {
    expect(checkDuplicateDeclarations(componentCss(read(path)))).toEqual([]);
  });

  it.each(astroFiles)('%s names its custom properties in English', (path) => {
    // The CSS, and only the CSS. Handed the whole file, the guard would read
    // the `//` comments of the frontmatter too — which stripComments cannot
    // blank — and report the Italian in a line explaining the rename.
    expect(checkItalianCustomProperties(componentCss(read(path)), path)).toEqual([]);
  });

  it.each(astroFiles)('%s names its data-* attributes in English', (path) => {
    // This one does want the whole file: the attribute lives in the markup,
    // which is exactly the half no stylesheet can speak for.
    expect(checkItalianDataAttributes(read(path), path)).toEqual([]);
  });
});

/* The three halves of the time zone.
 *
 * Cloudflare builds in UTC and the evenings happen in Turin. A formatter with
 * no `timeZone` is right on a laptop in Italy and two hours wrong in
 * production — nothing fails, the page just says «ore 19». The methods that
 * read a date component in the machine's own zone are the same defect with no
 * option to fix it, so they are forbidden rather than checked. And the last
 * guard keeps the pure modules unable to ask what time it is, which is what
 * makes the boundary testable at all: with `now` in the arguments the two
 * clock changes are four assertions in events.test.ts instead of two nights a
 * year.
 */
describe('the code that handles dates', () => {
  it('has code to check in the first place', () => {
    expect(codeFiles.length).toBeGreaterThan(0);
    expect(pureModules.length).toBeGreaterThan(0);
  });

  it.each(codeFiles)('%s names the time zone wherever it formats a date', (path) => {
    expect(checkMissingTimeZone(read(path), path).map((violation) => violation.detail)).toEqual(
      [],
    );
  });

  it.each(codeFiles)('%s reads no date component in the machine zone', (path) => {
    expect(checkLocalDateMethods(read(path), path).map((violation) => violation.detail)).toEqual(
      [],
    );
  });

  it.each(pureModules)('%s does not read the clock', (path) => {
    // Every module of src/lib/ except the one place the clock is allowed:
    // loadProgramme(), once, with the value passed down from there. Named as
    // an exception rather than as the only file checked — the guard used to
    // be pointed at a single hard-coded path, so the second pure module
    // would have arrived unguarded.
    expect(checkAmbientTime(read(path), path).map((violation) => violation.detail)).toEqual([]);
  });

  it('has the clock in programme.ts and nowhere else in src/lib', () => {
    // The other side of the exception: if loadProgramme() ever stops reading
    // the clock, the list above is guarding a rule nobody is bound by.
    expect(checkAmbientTime(read(CLOCK_HOLDER), CLOCK_HOLDER).length).toBeGreaterThan(0);
  });
});

/* The content, which is the other side of the language boundary.
 *
 * Nothing here reads the Italian itself: whether it is written well is read by
 * a person, and the guard that tried to check the accents was removed for it
 * — decisioni.md says why. What is left are the things a reader cannot see by
 * reading: that every file parses, and that the four samples hold together on
 * their own terms.
 */
describe('src/content', () => {
  const events = collectionEntries('eventi');
  const cycles = collectionEntries('cicli');

  it('has content to check in the first place', () => {
    expect(events.length).toBeGreaterThan(0);
    expect(cycles.length).toBeGreaterThan(0);
  });

  it.each([...events, ...cycles].map((entry) => [entry.path, entry] as const))(
    '%s has frontmatter that parses',
    (_path, entry) => {
      // One failing file, one failing test — instead of the parse error taking
      // the whole file down while it is being collected and every guard below
      // going unrun.
      expect(entry.error).toBeUndefined();
    },
  );

  it.each(events.map((event) => [event.path, event] as const))(
    '%s has a date that parses',
    (_path, event) => {
      // The check below reports an unreadable date as well, but in a sentence
      // about the programme. This one fails with the file name in the title
      // of the test, which is what the editor who typed it needs.
      expect(Number.isNaN(dateOf(event).getTime())).toBe(false);
    },
  );

  it('numbers the evenings in the order they happen', () => {
    // The site is ordered by number and everything else is worked out from
    // the date: if the two disagree the programme reads in one order and
    // reasons in another. The build fails on this too — programme.ts throws —
    // but this says which pair and does not need a build to say it.
    const programme = events.map((event) => ({
      number: Number(event.data.number),
      title: String(event.data.title ?? event.path),
      date: dateOf(event),
    }));
    expect(findNumberDateConflicts(programme)).toEqual([]);
  });

  it('keeps a sample of a role overridden on the event', () => {
    // The `speakers[].role ?? person.role` branch has no other coverage: no
    // guard can see it, and the day no content file carries an override the
    // pages resolve it in whichever order they were written, undisturbed. The
    // field exists so that an evening from 2019 shows the role held then, and
    // that is the kind of mistake nobody notices for a year.
    const overrides = events.flatMap((event) => {
      const speakers = event.data.speakers;
      return Array.isArray(speakers) ? speakers : [];
    });
    expect(
      overrides.filter(
        (speaker) => typeof (speaker as { role?: unknown })?.role === 'string',
      ).length,
    ).toBeGreaterThan(0);
  });

  it.each(events.map((event) => [event.path, event] as const))(
    '%s lists nobody twice among its speakers',
    (_path, event) => {
      expect(checkDuplicateSpeakers(event.data, event.path)).toEqual([]);
    },
  );

  it.each(events.map((event) => [event.path, event] as const))(
    '%s has no kicker repeating the name of its cycle',
    (_path, event) => {
      const cycle = cycles.find((entry) => entry.id === event.data.cycle);
      // A reference that resolves to nothing is the build's business, not
      // this guard's: astro:content fails on it long before here.
      const name = typeof cycle?.data.name === 'string' ? cycle.data.name : '';
      expect(checkKickerRepeatsCycle(event.data, name, event.path)).toEqual([]);
    },
  );
});

describe('src/styles/tokens/colors.css', () => {
  it('keeps every --*-rgb triple in step with its hex colour', () => {
    expect(checkRgbTriples(read('src/styles/tokens/colors.css'))).toEqual([]);
  });
});

describe('src/styles/tokens/spacing.css', () => {
  it('writes the scene-height fallback as @supports', () => {
    expect(checkSceneHeightFallback(read('src/styles/tokens/spacing.css'))).toEqual([]);
  });
});

describe('src/styles/tokens/fonts.css', () => {
  it('declares Archivo Black as a weight range, not a single weight', () => {
    expect(
      checkDisplayFontWeightRange(read('src/styles/tokens/fonts.css')),
    ).toEqual([]);
  });
});

describe('package.json', () => {
  const manifest = readJson('package.json');

  it('depends on nothing Tailwind', () => {
    expect(checkNoTailwind(manifest)).toEqual([]);
  });

  it('agrees with the lockfile about what is development-only', () => {
    expect(checkDevDepsInLockfile(manifest, readJson('package-lock.json'))).toEqual([]);
  });

  it('builds in UTC, the zone Cloudflare builds in', () => {
    // The zone belongs to the build script and not only to the globalSetup of
    // the test layer, and this is what holds it there. Set in the setup alone,
    // the invariant «the dist under test was built in UTC» held only when the
    // setup actually built: `REUSE_DIST=1` over a dist built by hand in Turin
    // published Italian hours for the wrong reason and the suite agreed.
    const scripts = (manifest as { scripts?: Record<string, string> }).scripts ?? {};
    expect(scripts.build ?? '').toContain('TZ=UTC');
  });
});
