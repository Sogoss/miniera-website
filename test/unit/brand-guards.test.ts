/* Negative tests for the guards over rule 7.
 *
 * The defect they watch is the quietest kind there is: a page that renders
 * perfectly, with half the name of the association on it.
 */
import { describe, expect, it } from 'vitest';
import {
  brandElements,
  checkBrandSignature,
  checkNoShortBrandVariant,
} from '../guards/brand.ts';

/** What the component publishes: three nested spans, signature in the last. */
const MARK =
  '<span class="brand" data-brand data-tone="cream" style="--brand-height: 13px">' +
  '<span class="brand-bar" aria-hidden="true"></span>' +
  '<span class="brand-lines">' +
  '<span class="brand-name">Miniera Culturale</span>' +
  '<span class="brand-signature">in Periferia</span>' +
  '</span></span>';

describe('checkBrandSignature', () => {
  it('accepts a mark used in full', () => {
    expect(checkBrandSignature(MARK, 'dist/index.html')).toEqual([]);
  });

  it('reports a mark published without its signature', () => {
    const truncated = '<span data-brand><span class="brand-name">Miniera Culturale</span></span>';
    const violations = checkBrandSignature(truncated, 'dist/index.html');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('in Periferia');
    expect(violations[0]!.detail).toContain('dist/index.html');
  });

  it('does not accept a signature that only exists in an attribute', () => {
    // The fix somebody reaches for when the mark does not fit: leave the
    // visible text short and put the full name in an aria-label. A reader sees
    // the short variant, which is the thing rule 7 forbids.
    const attributed =
      '<span data-brand aria-label="Miniera Culturale in Periferia">Miniera Culturale</span>';
    expect(checkBrandSignature(attributed)).toHaveLength(1);
  });

  it('reads through the nesting instead of stopping at the first closing tag', () => {
    // The signature is in the innermost span. A guard that stopped at the first
    // </span> would read the accent bar — empty — and report every correct mark
    // ever published, which is the half of a wrong guard that gets it deleted.
    expect(brandElements(MARK)[0]!.text).toBe('Miniera Culturale in Periferia');
  });

  it('accepts the signature however it is cased and spaced', () => {
    const banded = '<div data-brand>\n  MINIERA CULTURALE\n  IN PERIFERIA\n</div>';
    expect(checkBrandSignature(banded)).toEqual([]);
  });

  it('says nothing about a page with no mark on it', () => {
    expect(checkBrandSignature('<p>Miniera Culturale</p>')).toEqual([]);
  });

  it('reports each of two marks on one page', () => {
    const twice = `${MARK}<span data-brand>Miniera Culturale</span>`;
    expect(checkBrandSignature(twice)).toHaveLength(1);
  });

  it('ignores a mark left in a comment', () => {
    expect(checkBrandSignature('<!-- <span data-brand>Miniera Culturale</span> -->')).toEqual([]);
  });

  it('does not mistake another attribute for data-brand', () => {
    // `data-brand-tone` is not the mark, and reading it as one would fire on
    // markup that is perfectly correct.
    expect(checkBrandSignature('<span data-brand-tone="cream">Miniera Culturale</span>')).toEqual([]);
  });
});

describe('checkNoShortBrandVariant', () => {
  it('accepts the component as it stands', () => {
    const source = `interface Props {
      height?: number;
      tone?: BrandTone;
    }`;
    expect(checkNoShortBrandVariant(source)).toEqual([]);
  });

  it('reports the prop that lets the short variant back in', () => {
    // The export had exactly this, and rule 7 exists because somebody used it.
    const source = `interface Props {
      shape?: 'full' | 'short';
      height?: number;
    }`;
    const violations = checkNoShortBrandVariant(source, 'src/components/Brand.astro');
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0]!.detail).toContain('shape');
    expect(violations[0]!.detail).toContain('Brand.astro');
  });

  it('reports the Italian name too, which is what the export called it', () => {
    expect(checkNoShortBrandVariant("interface Props { forma?: 'esteso' | 'breve' }")).toHaveLength(2);
  });

  it('says nothing about a prop that merely mentions a shape in prose', () => {
    // A guard that fired on a comment explaining the rule would be switched off
    // by the first person who wrote one.
    const source = `interface Props {
      /* The mark has one shape: rule 7, and the short variant does not exist. */
      height?: number;
    }`;
    expect(checkNoShortBrandVariant(source)).toEqual([]);
  });
});
