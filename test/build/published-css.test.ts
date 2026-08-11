/* The guards that can only be checked on the published file.
 *
 * Reading the source is not enough: the minifier can take things out, and it
 * already has once — the collapsed double declaration that removed the
 * `--h-scena` fallback from production while the source still showed it.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import {
  checkNoColorMixOrOklch,
  checkRgbTriples,
  checkSceneHeightFallback,
} from '../guards/css.ts';
import { checkDisplayFontWeightRange } from '../guards/fonts.ts';
import { readPublishedCss } from '../support/dist.ts';

let css = '';

beforeAll(() => {
  css = readPublishedCss();
});

describe('the CSS that actually ships', () => {
  it('is not empty', () => {
    // Every assertion below would pass on an empty string. This one makes the
    // rest mean something.
    expect(css.length).toBeGreaterThan(0);
    expect(css).toContain('--h-scena');
  });

  it('still carries the vh fallback and the @supports that raises it', () => {
    expect(checkSceneHeightFallback(css)).toEqual([]);
  });

  it('contains neither color-mix() nor oklch()', () => {
    expect(checkNoColorMixOrOklch(css)).toEqual([]);
  });

  it('keeps every --*-rgb triple in step with its hex colour', () => {
    expect(checkRgbTriples(css)).toEqual([]);
  });

  it('still declares Archivo Black as a weight range', () => {
    // The @font-face survives bundling, so unlike rule 4 this one can be
    // checked on the published file — which is where the browser reads it.
    expect(checkDisplayFontWeightRange(css)).toEqual([]);
  });
});
