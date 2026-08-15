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
  checkRawColourValues,
  checkRgbTriples,
  checkSceneHeightFallback,
  checkUndefinedCustomProperties,
} from '../guards/css.ts';
import {
  checkDateHasOffset,
  checkDuplicateSpeakers,
  checkKickerRepeatsCycle,
} from '../guards/content.ts';
import { checkNoShortBrandVariant } from '../guards/brand.ts';
import {
  checkCmsConfigAgainstSchema,
  checkCmsDateTimezone,
  checkCmsFieldCoverage,
  checkCmsFieldKinds,
  checkCmsImageLimits,
  checkCmsRequiredParity,
  checkEntryFileNames,
  checkNoEntryBody,
  cmsCollection,
  collectionsOf,
  slugTemplate,
} from '../guards/cms.ts';
import { cmsConfig, cmsSchema } from '../support/cms.ts';
import { schemaCollections, schemaFields } from '../support/schema.ts';
import { checkEmailSource, checkWhatsappSource } from '../guards/contact.ts';
import { EMAIL, WHATSAPP_NUMBER } from '../../src/lib/contact.ts';
import { checkPlaceholderSource } from '../guards/placeholder.ts';
import { placeholderTexts } from '../../src/lib/placeholder.ts';
import { checkStaleVenue } from '../guards/venue.ts';
import { FORMER_ADDRESSES, fullAddress } from '../../src/lib/venues.ts';
import { checkAccentContrast, checkHandWrittenCycleRules } from '../guards/cycles.ts';
import { cycleAccentCss, findCycleNumberConflicts } from '../../src/lib/cycles.ts';
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
import { checkNoClientDirectives, checkNoUiFramework } from '../guards/react.ts';
import { checkHistoryPush } from '../guards/routes.ts';
import { checkSmoothScrollArgument } from '../guards/scroller.ts';
import { checkHandWrittenShapes } from '../guards/shapes.ts';
import { collectionEntries, dateOf, slugifySegment } from '../support/frontmatter.ts';
import {
  exists,
  filesWithExtension,
  isVendored,
  read,
  readJson,
  repoRoot,
} from '../support/paths.ts';
import { componentCss } from '../support/styles.ts';

const styleFiles = filesWithExtension(join(repoRoot, 'src/styles'), ['.css']);
/* Every stylesheet the build can ship, which is a wider net than the tokens:
   a .css sitting next to a component, and everything in public/, which is
   copied into dist/ verbatim. Rule 12 has to be asked of all of them — a
   hand-written accent rule in public/overrides.css would pass both halves of
   the rule while quietly deciding the colour of a cycle. */
const shippedCss = [
  ...filesWithExtension(join(repoRoot, 'src'), ['.css']),
  ...(exists('public') ? filesWithExtension(join(repoRoot, 'public'), ['.css']) : []),
].filter((path) => !isVendored(path));
const astroFiles = filesWithExtension(join(repoRoot, 'src'), ['.astro']);
/* Everything in src/ that can format a date: the modules and the frontmatter
   of the components. */
const codeFiles = filesWithExtension(join(repoRoot, 'src'), ['.ts', '.astro']);

/* The one file allowed to read the clock, and everything else that is not.
   A list built from the folder, not a path written by hand: the second pure
   module under src/lib/ has to arrive guarded — and so does the scroller.
   Pointed at src/lib alone, this left every component and page free to write
   its own `new Date()`, which is the same self-contradicting build the one
   clock read in programme.ts exists to prevent. */
const CLOCK_HOLDER = 'src/lib/programme.ts';
const clocklessFiles = codeFiles.filter((path) => path !== CLOCK_HOLDER);

/* The same shape for the association's number: one file writes it, every other
   file asks for the link. Derived from the folder like the list above, so a
   component added tomorrow arrives guarded.

   And over everything the build can ship, not over src/ alone — the same wider
   net as the stylesheets above, and for the same reason. `public/` is copied
   into dist/ verbatim and PR 14 puts the Sveltia shell there; `scripts/` and
   the config are code that runs. A second copy of the number in any of them
   ships, and drifts the day the number changes, with nothing red. Rule 12 had
   already learnt this about `public/`; rule 17 was written knowing it and
   pointed at src/ anyway. */
const NUMBER_HOLDER = 'src/lib/contact.ts';
const SHIPPED_TEXT = ['.ts', '.astro', '.mjs', '.js', '.json', '.html', '.css', '.svg', '.txt'];
const shippedText = [
  ...filesWithExtension(join(repoRoot, 'src'), SHIPPED_TEXT),
  ...(exists('public') ? filesWithExtension(join(repoRoot, 'public'), SHIPPED_TEXT) : []),
  ...filesWithExtension(join(repoRoot, 'scripts'), SHIPPED_TEXT),
  'astro.config.mjs',
].filter((path) => !isVendored(path));
const numberlessFiles = shippedText.filter((path) => path !== NUMBER_HOLDER);

/* The same shape twice more, for the two facts PR 13 added to the same family.
   The address of the hall is spelled by src/lib/venues.ts and the design's is
   still written in design-export/, five times; the placeholders are all in
   src/lib/placeholder.ts, and «all of them» is the property that makes
   replacing them one edit rather than a hunt. In both cases the file that owns
   the fact is the one file allowed to write it. */
const VENUE_HOLDER = 'src/lib/venues.ts';
const addresslessFiles = shippedText.filter((path) => path !== VENUE_HOLDER);

const PLACEHOLDER_HOLDER = 'src/lib/placeholder.ts';
const placeholderlessFiles = shippedText.filter((path) => path !== PLACEHOLDER_HOLDER);

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

  it('has every shipped stylesheet, not only the tokens, to check', () => {
    expect(shippedCss.length).toBeGreaterThanOrEqual(styleFiles.length);
    for (const path of styleFiles) expect(shippedCss).toContain(path);
  });

  it.each(shippedCss)('%s leaves the cycle accents to the collection', (path) => {
    // colors.css held five of these until PR 4, pointing at five tokens, and
    // the colour an editor wrote in a file reached nobody. Put back as a
    // fallback they would have the same specificity as the emitted rules, so
    // the order of the stylesheets would decide the colour of the site.
    // Asked of every stylesheet that ships and not only of src/styles: public/
    // is copied into dist/ as it stands, and a rule there is just as final.
    expect(checkHandWrittenCycleRules(read(path), path)).toEqual([]);
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

  it.each(astroFiles)('%s leaves the cycle accents to the collection', (path) => {
    // The component that emits them has an empty <style>: what it writes is
    // built at run time and belongs to no source file, which is the point.
    expect(checkHandWrittenCycleRules(componentCss(read(path)), path)).toEqual([]);
  });

  it.each(astroFiles)('%s takes its colours from the tokens', (path) => {
    // Rule 2, in the one place it can go wrong quietly. A hex typed into a
    // component looks right the day it is typed and drifts the day the token
    // it duplicates is retuned — one border keeps the old blue and nothing
    // fails. The tokens themselves are not asked this: declaring the palette
    // is what they are for.
    expect(checkRawColourValues(componentCss(read(path)), path)).toEqual([]);
  });

  it.each(astroFiles)('%s renders at build time, not in a browser', (path) => {
    // Rule 9. An island renders correctly and fails nothing — what it costs is
    // a framework in the browser for components that have no logic in them.
    expect(checkNoClientDirectives(read(path), path)).toEqual([]);
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
    expect(clocklessFiles.length).toBeGreaterThan(0);
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

  it.each(codeFiles)('%s leaves smooth scrolling to the stylesheet', (path) => {
    // Not about dates, and here because this is where src/ is read file by
    // file. `behavior: 'smooth'` passed to a scroll call beats the
    // `scroll-behavior: auto !important` that global.css sets under
    // prefers-reduced-motion — the argument wins over the property — so the one
    // control a reader prone to motion sickness has stops working, with nothing
    // to see in dist/ and nothing failing.
    expect(checkSmoothScrollArgument(read(path), path).map((v) => v.detail)).toEqual([]);
  });

  it.each(codeFiles)('%s replaces the address instead of pushing it', (path) => {
    // The programme rewrites the address as the reader scrolls. Pushed rather
    // than replaced, that is one history entry per evening crossed: the back
    // button stops leaving the site and starts walking the archive backwards,
    // and the page looks identical either way.
    expect(checkHistoryPush(read(path), path).map((v) => v.detail)).toEqual([]);
  });

  it.each(clocklessFiles)('%s does not read the clock', (path) => {
    // Every file of src/ except the one place the clock is allowed:
    // loadProgramme(), once, with the value passed down from there. Named as
    // an exception rather than as the only file checked — the guard used to be
    // pointed at a single hard-coded path, then at src/lib alone, which left a
    // component free to work out its own «adesso» and publish an evening as
    // upcoming on one page and past on the next.
    expect(checkAmbientTime(read(path), path).map((violation) => violation.detail)).toEqual([]);
  });

  it('has the clock in programme.ts and nowhere else in src', () => {
    // The other side of the exception: if loadProgramme() ever stops reading
    // the clock, the list above is guarding a rule nobody is bound by.
    expect(checkAmbientTime(read(CLOCK_HOLDER), CLOCK_HOLDER).length).toBeGreaterThan(0);
  });
});

/* The number the booking is made of, and the one file allowed to write it.
 *
 * Read the same way as the clock above, and for the same reason: what makes a
 * second copy dangerous is not that it is wrong today — it is right today —
 * but that the day the number changes, one of the two follows and the other
 * goes on opening a chat with a stranger, with the page around it perfect. */
describe('the WhatsApp number', () => {
  it.each(numberlessFiles)('%s asks the domain for the link', (path) => {
    expect(checkWhatsappSource(read(path), WHATSAPP_NUMBER, path).map((v) => v.detail)).toEqual([]);
  });

  it('has the number in contact.ts and nowhere else in src', () => {
    // The other side of the exception. Without this the list above could be
    // guarding an empty rule: a number that has moved out of the module, or a
    // guard that has stopped recognising one, both read as «all clear».
    expect(checkWhatsappSource(read(NUMBER_HOLDER), WHATSAPP_NUMBER, NUMBER_HOLDER).length)
      .toBeGreaterThan(0);
  });

  it.each(numberlessFiles)('%s asks the domain for the address too', (path) => {
    expect(checkEmailSource(read(path), EMAIL, path).map((v) => v.detail)).toEqual([]);
  });

  it('has the address in contact.ts, and a mailto nowhere', () => {
    expect(checkEmailSource(read(NUMBER_HOLDER), EMAIL, NUMBER_HOLDER).length).toBeGreaterThan(0);
  });
});

/* The address of the hall, which is the same rule seen from a third side.
 *
 * The collection has held it since the schema existed; what was being written
 * by hand was the *spelling*, in two places that disagreed. Now one function
 * spells it, and what this watches is the other way a wrong address arrives:
 * the design's, copied out of design-export/ — where it is written five times,
 * naming a building this association has never been in. */
describe('the address of the hall', () => {
  it.each(addresslessFiles)('%s does not carry the address of the design', (path) => {
    expect(checkStaleVenue(read(path), FORMER_ADDRESSES, path).map((v) => v.detail)).toEqual([]);
  });

  it('names it in venues.ts, so that the guard has something to recognise', () => {
    // The other side of the exception, and the anti-vacuity half: an empty
    // FORMER_ADDRESSES would make every assertion above agree for ever.
    expect(FORMER_ADDRESSES.length).toBeGreaterThan(0);
    expect(checkStaleVenue(read(VENUE_HOLDER), FORMER_ADDRESSES, VENUE_HOLDER).length)
      .toBeGreaterThan(0);
  });

  it('is spelled by one function and read from the collection', () => {
    // The positive half: what the pages publish is what the collection says.
    const venues = collectionEntries('sedi');
    expect(venues.length).toBeGreaterThan(0);
    for (const venue of venues) {
      const spelled = fullAddress({
        name: String(venue.data.name),
        address: String(venue.data.address),
        city: String(venue.data.city),
      });
      expect(checkStaleVenue(spelled, FORMER_ADDRESSES, `src/content/sedi/${venue.id}.md`))
        .toEqual([]);
    }
  });
});

/* The text that is not written yet, which has one home for a reason: the day
   the association sends its own, replacing it has to be one file to empty and
   not a hunt through the pages. */
describe('the placeholders', () => {
  it.each(placeholderlessFiles)('%s takes its placeholders from the module', (path) => {
    expect(checkPlaceholderSource(read(path), placeholderTexts(), path).map((v) => v.detail))
      .toEqual([]);
  });

  it('writes them in placeholder.ts, and has some to write', () => {
    expect(placeholderTexts().length).toBeGreaterThan(5);
    expect(
      checkPlaceholderSource(read(PLACEHOLDER_HOLDER), placeholderTexts(), PLACEHOLDER_HOLDER)
        .length,
    ).toBeGreaterThan(0);
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

  /* The cycles in the shape the domain works on. Read off the frontmatter
     rather than through astro:content, so the checks below say which file is
     wrong without a build having to run first. */
  const cycleEntries = cycles.map((entry) => ({
    id: entry.id,
    number: Number(entry.data.number),
    name: String(entry.data.name ?? entry.path),
    color: String(entry.data.color ?? ''),
  }));

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

  it('numbers each cycle once', () => {
    // The number of a cycle is how it is named in the CSS, so two files
    // claiming one number emit two rules and the last one wins: half the
    // evenings take the other cycle's colour, and nothing fails. The build
    // stops on this too — loadCycleAccents throws — but this says which pair
    // and does not need a build to say it.
    expect(findCycleNumberConflicts(cycleEntries)).toEqual([]);
  });

  it('gives every cycle a colour that reaches the CSS', () => {
    // A colour the generator does not recognise stops the build with a message
    // naming the cycle; here it names the file as well, and before the build.
    expect(() => cycleAccentCss(cycleEntries)).not.toThrow();
  });

  /* Every surface an accent is actually painted on.
   *
   * `--blue-700` is the page; `--blue-600` is `--surface-raised`, which is what
   * an EventCard and a raised Card sit on — and the accent stripe along their
   * top edge is drawn straight onto it. Asked of the page ground alone, this
   * check certified a contrast the site does not have where its main listing
   * unit draws the colour: a cycle at exactly 3.00:1 against the page is at
   * 2.37:1 against the raised surface, and nothing would have said so.
   *
   * Both are read from the tokens rather than written here, so retuning a
   * surface moves the check with it. */
  const grounds = ['blue-700', 'blue-600'].map((token) => {
    const hex = new RegExp(`--${token}\\s*:\\s*(#[0-9a-fA-F]{6})`).exec(
      read('src/styles/tokens/colors.css'),
    )?.[1];
    return [token, hex] as const;
  });

  it('reads both grounds out of the tokens', () => {
    // Without this the loop below would pass over `undefined` grounds the day
    // a token is renamed, which is a check that stops checking in silence.
    for (const [token, hex] of grounds) {
      expect(hex, `colors.css no longer declares --${token}`).toBeTruthy();
    }
  });

  it.each(
    cycleEntries.flatMap((cycle) =>
      grounds.map(([token, hex]) => [cycle.id, token, cycle, hex] as const),
    ),
  )('%s has an accent that can be read on --%s', (_id, _token, cycle, hex) => {
    // What the five hand-written rules used to guarantee by construction: an
    // accent could only be one of the tuned tokens. Now it comes from a content
    // file, and a valid hex can still be invisible on the blue.
    expect(
      checkAccentContrast(cycle, hex!, `src/content/cicli/${cycle.id}.md`),
    ).toEqual([]);
  });

  /* The other direction, added at PR 13: since the navigation the accent is
     not only drawn but *written on*. The current voice is a label in
     `--text-on-accent` over the cycle's colour, and a word wants 4.5:1 where a
     border wants 3.
   *
   * Measured rather than assumed, and the measurement is worth writing down:
   * on a ground this dark the 3:1 above already implies this. Passing 3:1
   * against `#003049` puts a colour over 0.179 relative luminance, and anything
   * over 0.175 is already past 4.5:1 against black — the six colours in the
   * repository sit between 5.89 and 8.43. So this cannot fail today, and it is
   * here for the day one of its two premises stops holding: `--text-on-accent`
   * is a token, and a designer who sets it to `--blue-900` — the obvious
   * «softer black» — takes several accents under the line at once, on a page
   * where nothing else changes. The ink is read out of the tokens for that
   * reason, and resolved through the `var()` it is declared as. */
  const ink = (() => {
    const colours = read('src/styles/tokens/colors.css');
    const declared = /--text-on-accent\s*:\s*([^;]+);/.exec(colours)?.[1]?.trim() ?? '';
    const named = /^var\(\s*(--[\w-]+)\s*\)$/.exec(declared)?.[1];
    if (!named) return declared;
    return new RegExp(`${named}\\s*:\\s*(#[0-9a-fA-F]{6})`).exec(colours)?.[1] ?? '';
  })();

  it('reads the ink of the accent out of the tokens', () => {
    // Without this the assertion below passes over an empty string the day the
    // token is renamed, which is a check that stops checking in silence.
    expect(ink, 'colors.css no longer declares --text-on-accent as a hex').toMatch(
      /^#[0-9a-fA-F]{6}$/,
    );

    /* And once, because the reading above takes the first declaration and no
       other. colors.css already carries a `[data-theme="paper"]` block that
       flips six ink tokens; the day it flips this one too, every assertion
       below would go on measuring the dark theme's black and the paper theme
       would be checked by nothing — the same silence the line above is for. */
    const declarations = [...read('src/styles/tokens/colors.css').matchAll(
      /--text-on-accent\s*:/g,
    )];
    expect(
      declarations.length,
      'a second block declares --text-on-accent and only the first one is measured',
    ).toBe(1);
  });

  it.each(cycleEntries.map((cycle) => [cycle.id, cycle] as const))(
    '%s can be written on, not only drawn with',
    (_id, cycle) => {
      expect(
        checkAccentContrast(cycle, ink, `src/content/cicli/${cycle.id}.md`, 4.5),
      ).toEqual([]);
    },
  );

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
    '%s says which zone its date is in',
    (_path, event) => {
      // The one defect of this family that lives in the content and not in the
      // code: `z.coerce.date()` reads a date with no offset in the zone of the
      // machine parsing it, and that machine is Cloudflare, in UTC. Nine in the
      // evening becomes «ore 22» in production and stays right on the laptop
      // where it was typed.
      expect(checkDateHasOffset(event.data, event.path)).toEqual([]);
    },
  );

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

  it.each(
    schemaCollections().flatMap((collection) =>
      collectionEntries(collection).map((entry) => [entry.path, entry] as const),
    ),
  )('%s carries no body under its frontmatter', (_path, entry) => {
    // Nothing renders one, and the form has no field for it: prose written
    // there reaches nobody and is dropped the first time the entry is saved
    // from /admin.
    expect(checkNoEntryBody(read(entry.path), entry.path)).toEqual([]);
  });
});

describe('public/admin/config.yml', () => {
  /* The other half of rule 21. The fixtures next door prove these can fail;
     this is the pair they exist for — the real form against the real schema,
     read out of src/content.config.ts rather than out of a list written here,
     which would be the third copy of the thing being kept in step. */
  const config = cmsConfig();
  const collections = schemaCollections();

  it('has the four collections of the schema, and no fifth', () => {
    expect(collections.length).toBeGreaterThan(0);
    expect(collectionsOf(config).map((collection) => collection.name).sort()).toEqual(
      [...collections].sort(),
    );
  });

  it.each(collections)('offers every field of %s, and nothing else', (collection) => {
    const fields = cmsCollection(config, collection)?.fields;
    expect(checkCmsFieldCoverage(schemaFields(collection), fields, collection)).toEqual([]);
  });

  it.each(collections)('agrees with %s about what may be left empty', (collection) => {
    const fields = cmsCollection(config, collection)?.fields;
    expect(checkCmsRequiredParity(schemaFields(collection), fields, collection)).toEqual([]);
  });

  it.each(collections)('writes every field of %s with a widget that fits it', (collection) => {
    const fields = cmsCollection(config, collection)?.fields;
    expect(checkCmsFieldKinds(schemaFields(collection), fields, collection)).toEqual([]);
  });

  it('has a field for each kind the checks above can tell apart', () => {
    // Otherwise the three assertions above would be passing over a schema with
    // nothing in it to disagree about: a relation, an enum, a date and an image
    // are the four the widget check has anything to say about.
    const kinds = new Set(collections.flatMap((name) => schemaFields(name)).map((field) => field.kind));
    expect([...kinds].sort()).toEqual(
      expect.arrayContaining(['date', 'enum', 'image', 'list', 'reference']),
    );
  });

  it('is configuration Sveltia itself would accept', () => {
    // Everything else here compares our two files with each other, and all of
    // it reads the keys this repository writes: a misspelt `input_timezone`
    // would be found and approved under its misspelling, while the CMS — which
    // never saw that key — falls back to the browser's zone. The third party to
    // the agreement is Sveltia, and this is its own schema, out of the version
    // the lockfile pins.
    expect(checkCmsConfigAgainstSchema(config, cmsSchema())).toEqual([]);
  });

  it('makes the date field write Italian time, wherever the editor is', () => {
    expect(checkCmsDateTimezone(config)).toEqual([]);
  });

  it('gives every image field a ceiling before the commit', () => {
    expect(checkCmsImageLimits(config)).toEqual([]);
  });

  it.each(collections)('names the files of %s the way it would name them', (collection) => {
    const entries = collectionEntries(collection);
    expect(entries.length).toBeGreaterThan(0);
    expect(
      checkEntryFileNames(
        entries,
        slugTemplate(cmsCollection(config, collection)),
        slugifySegment,
        collection,
      ),
    ).toEqual([]);
  });

  it('signs in against this repository, on the branch that publishes', () => {
    // Two strings that are configuration and not code, and the only two that
    // decide where an editor's work lands. Pointed at a fork, or at a branch
    // nothing builds from, everything else here is still perfectly correct.
    const backend = (config as { backend?: Record<string, unknown> }).backend ?? {};
    expect(backend.name).toBe('github');
    expect(backend.repo).toBe('miniera-culturale/website');
    expect(backend.branch).toBe('main');
  });
});

describe('the clip shapes', () => {
  const component = 'src/components/ClipShapes.astro';
  const module = 'src/lib/shapes.ts';

  it.each([component, module])('%s writes no geometry by hand', (path) => {
    // Rule 13's headline, which had no guard while its corollary about empty
    // clip paths did: somebody pastes a path out of a library, the shape
    // publishes, every other check stays green, and the constraint the whole of
    // shapes.ts exists for is gone. `clip-skewed` is the declared exception —
    // Material has no equivalent to generate it from.
    expect(checkHandWrittenShapes(read(path), path)).toEqual([]);
  });
});

describe('src/components/Brand.astro', () => {
  const path = 'src/components/Brand.astro';

  it('exists, which is what everything below is about', () => {
    expect(exists(path)).toBe(true);
  });

  it('offers no way to ask for a short mark', () => {
    // Rule 7 from the side the published page cannot see: a prop added «just
    // for the footer» is caught here, before anything is published without its
    // signature. The export had one, and the rule exists because it got used.
    expect(checkNoShortBrandVariant(read(path), path)).toEqual([]);
  });

  it('writes the signature into the markup, not into a prop with a default', () => {
    // A default is a value somebody can pass something else for. The words are
    // in the template, where a caller cannot reach them.
    expect(read(path)).toContain('>in Periferia<');
  });
});

describe('src/styles/tokens/colors.css', () => {
  it('keeps every --*-rgb triple in step with its hex colour', () => {
    expect(checkRgbTriples(read('src/styles/tokens/colors.css'))).toEqual([]);
  });

  it('points --accent and --accent-rgb at the same cycle', () => {
    // The one pair checkRgbTriples cannot check: both sides are `var()`, which
    // it skips by design, so retuning the outside-a-cycle accent and forgetting
    // the line under it would publish one colour with another's transparencies
    // — a mismatch small enough to read as a design decision.
    const css = read('src/styles/tokens/colors.css');
    const colour = /--accent\s*:\s*var\(\s*--cycle-(\d+)\s*\)/.exec(css)?.[1];
    const triple = /--accent-rgb\s*:\s*var\(\s*--cycle-(\d+)-rgb\s*\)/.exec(css)?.[1];
    expect(colour, 'no --accent default in colors.css').toBeTruthy();
    expect(triple).toBe(colour);
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

  it('depends on no UI framework', () => {
    // Rule 9: the eight components are .astro. One of them had state in the
    // export — the pressed button — and it is three lines of CSS here.
    expect(checkNoUiFramework(manifest)).toEqual([]);
  });

  it('has no component written for a framework', () => {
    // The other way an island arrives: a .jsx or .tsx file under src/. Astro
    // will not render it without an integration, so this cannot break quietly
    // — but it is where somebody starts, and the answer is that the file does
    // not belong here rather than that the integration is missing.
    const components = filesWithExtension(join(repoRoot, 'src'), ['.jsx', '.tsx']);
    expect(components).toEqual([]);
  });

  it('agrees with the lockfile about what is development-only', () => {
    expect(checkDevDepsInLockfile(manifest, readJson('package-lock.json'))).toEqual([]);
  });

  it('keeps the command that blinds the guards', () => {
    // The script answers a question nothing else can, and it answers it only
    // as long as it can be reached: renamed or dropped, the CI step goes red
    // with a message about npm rather than about the guards.
    const scripts = (manifest as { scripts?: Record<string, string> }).scripts ?? {};
    expect(scripts['test:mutate'] ?? '').toContain('mutate-guards.mjs');
    expect(exists('scripts/mutate-guards.mjs')).toBe(true);
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
