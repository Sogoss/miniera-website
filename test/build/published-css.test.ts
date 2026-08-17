/* The guards that can only be checked on the published file.
 *
 * Reading the source is not enough: the minifier can take things out, and it
 * already has once — the collapsed double declaration that removed the
 * `--scene-height` fallback from production while the source still showed it.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import {
  checkMediaRangeSyntax,
  checkNoColorMixOrOklch,
  checkPixelFontSizes,
  checkRgbTriples,
  checkSceneHeightFallback,
  checkUndefinedCustomProperties,
} from '../guards/css.ts';
import { checkDisplayFontWeightRange } from '../guards/fonts.ts';
import { checkItalianCustomProperties } from '../guards/language.ts';
import { readPublishedCss } from '../support/dist.ts';

let css = '';

beforeAll(() => {
  css = readPublishedCss();
});

describe('the CSS that actually ships', () => {
  it('keeps its media queries inside the browser floor', () => {
    // Left to itself the minifier rewrites `(max-width: 900px)` as
    // `(width <= 900px)`, which browsers understand from Safari 16.4 while this
    // project's floor is 15.4 — so every media query of the scroller would be
    // ignored between those versions and an iPhone would get the two-column
    // desktop layout, with the source saying exactly the right thing. The build
    // targets in astro.config.mjs are what prevents it; this is what notices if
    // they are ever dropped.
    expect(checkMediaRangeSyntax(css, 'dist/')).toEqual([]);
  });

  it('is not empty', () => {
    // Every assertion below would pass on an empty string. This one makes the
    // rest mean something.
    expect(css.length).toBeGreaterThan(0);
    expect(css).toContain('--scene-height');
  });

  it('still carries the vh fallback and the @supports that raises it', () => {
    expect(checkSceneHeightFallback(css)).toEqual([]);
  });

  it('sizes every piece of type in rem', () => {
    // Rule 23. The source layer next door reads the same guard, and this one is
    // not a duplicate of it: what a reader who enlarged the system text gets is
    // decided by the file the browser receives, and between the two sits a
    // minifier that rewrites values — `calc(0.5rem + 3.9vw)` among them.
    expect(checkPixelFontSizes(css, 'dist/')).toEqual([]);
  });

  it('contains neither color-mix() nor oklch()', () => {
    expect(checkNoColorMixOrOklch(css)).toEqual([]);
  });

  it('keeps every --*-rgb triple in step with its hex colour', () => {
    expect(checkRgbTriples(css)).toEqual([]);
  });

  it('reads no custom property that is declared nowhere', () => {
    // dist/ is where this one belongs: here every stylesheet has been brought
    // together, so a var() left over from a rename has nowhere left to hide
    // and no other file to be defined in.
    expect(checkUndefinedCustomProperties(css)).toEqual([]);
  });

  it('names every custom property in English', () => {
    expect(checkItalianCustomProperties(css, 'dist/')).toEqual([]);
  });

  it('still declares Archivo Black as a weight range', () => {
    // The @font-face survives bundling, so unlike rule 4 this one can be
    // checked on the published file — which is where the browser reads it.
    expect(checkDisplayFontWeightRange(css)).toEqual([]);
  });
});
