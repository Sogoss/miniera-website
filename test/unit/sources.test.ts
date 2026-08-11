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
} from '../guards/css.ts';
import { checkDisplayFontWeightRange } from '../guards/fonts.ts';
import { checkDevDepsInLockfile, checkNoTailwind } from '../guards/packages.ts';
import { filesWithExtension, read, readJson, repoRoot } from '../support/paths.ts';
import { styleBlocksOf } from '../support/styles.ts';

const styleFiles = filesWithExtension(join(repoRoot, 'src/styles'), ['.css']);
const astroFiles = filesWithExtension(join(repoRoot, 'src'), ['.astro']);

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
