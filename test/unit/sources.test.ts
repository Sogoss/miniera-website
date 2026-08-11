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
import { checkDisplayFontWeightRange } from '../guards/fonts.ts';
import {
  checkItalianCustomProperties,
  checkMissingAccents,
} from '../guards/language.ts';
import { checkDevDepsInLockfile, checkNoTailwind } from '../guards/packages.ts';
import { collectionEntries } from '../support/frontmatter.ts';
import { filesWithExtension, read, readJson, repoRoot } from '../support/paths.ts';
import { styleAttributesOf, styleBlocksOf } from '../support/styles.ts';

const styleFiles = filesWithExtension(join(repoRoot, 'src/styles'), ['.css']);
const astroFiles = filesWithExtension(join(repoRoot, 'src'), ['.astro']);

/* All the CSS the source has to offer, in one string: the stylesheets, the
   <style> blocks of the components, and the inline `style` attributes — which
   is where the temporary page keeps every token it reads.
   checkUndefinedCustomProperties needs it whole: the tokens are declared in
   one file and read from another, so file by file every one of them would look
   undefined. */
const allSourceCss = [
  ...styleFiles.map((path) => read(path)),
  ...astroFiles.map((path) => styleBlocksOf(read(path))),
  ...astroFiles.map((path) => styleAttributesOf(read(path))),
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
 */
describe('src/**/*.astro <style> blocks', () => {
  it('has .astro files to check in the first place', () => {
    expect(astroFiles.length).toBeGreaterThan(0);
  });

  it.each(astroFiles)('%s uses neither color-mix() nor oklch()', (path) => {
    expect(checkNoColorMixOrOklch(styleBlocksOf(read(path)))).toEqual([]);
  });

  it.each(astroFiles)('%s declares no property twice in one block', (path) => {
    expect(checkDuplicateDeclarations(styleBlocksOf(read(path)))).toEqual([]);
  });

  it.each(astroFiles)('%s names its custom properties in English', (path) => {
    // The <style> blocks and the inline `style` attributes alike: the
    // temporary page carries its tokens in the markup, and from PR 6 the
    // components will carry theirs in a block.
    expect(checkItalianCustomProperties(read(path), path)).toEqual([]);
  });
});

/* The content, which is the other side of the language boundary.
 *
 * Everything above asks that the code be English. These two ask that the
 * Italian be Italian — written with its accents — and that the four sample
 * files hold together on their own terms.
 */
describe('src/content', () => {
  const events = collectionEntries('eventi');
  const cycles = collectionEntries('cicli');
  const files = filesWithExtension(join(repoRoot, 'src/content'), ['.md']);

  it('has content to check in the first place', () => {
    expect(events.length).toBeGreaterThan(0);
    expect(cycles.length).toBeGreaterThan(0);
  });

  it.each(files)('%s writes its accents in full', (path) => {
    expect(checkMissingAccents(read(path), path)).toEqual([]);
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
});
