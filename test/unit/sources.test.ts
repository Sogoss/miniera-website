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
import { checkDevDepsInLockfile, checkNoTailwind } from '../guards/packages.ts';
import { filesWithExtension, read, readJson, repoRoot } from '../support/paths.ts';

const styleFiles = filesWithExtension(join(repoRoot, 'src/styles'), ['.css']);

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

describe('package.json', () => {
  const manifest = readJson('package.json');

  it('depends on nothing Tailwind', () => {
    expect(checkNoTailwind(manifest)).toEqual([]);
  });

  it('agrees with the lockfile about what is development-only', () => {
    expect(checkDevDepsInLockfile(manifest, readJson('package-lock.json'))).toEqual([]);
  });
});
