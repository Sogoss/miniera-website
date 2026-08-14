/* Negative tests for the guard over the address, and for the one function that
 * spells it.
 *
 * The defect is the quietest kind this site can publish: an association that
 * meets somewhere it has never met. Nothing fails, the page renders, and the
 * only way to notice is to know the street — which whoever copies the line out
 * of design-export/ does not, because that folder is the specification and its
 * address was never real.
 */
import { describe, expect, it } from 'vitest';
import { checkStaleVenue } from '../guards/venue.ts';
import { FORMER_ADDRESSES, fullAddress } from '../../src/lib/venues.ts';

const VENUE = {
  name: 'Palazzo ex Venchi Unica',
  address: 'Piazza Massaua 17/b',
  city: 'Torino',
};

describe('checkStaleVenue', () => {
  it('says nothing about the address the collection holds', () => {
    expect(checkStaleVenue(fullAddress(VENUE), FORMER_ADDRESSES, 'dist/chi-siamo/index.html'))
      .toEqual([]);
  });

  it('reports the address of the design', () => {
    const copied = '<span>Circolo di via Fratelli Rosselli 12</span>';
    const violations = checkStaleVenue(copied, FORMER_ADDRESSES, 'dist/chi-siamo/index.html');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('Fratelli Rosselli');
    expect(violations[0]!.detail).toContain('dist/chi-siamo/index.html');
  });

  it('reads it across a line break and in any case', () => {
    // Markup wraps where a formatter decides, and a guard defeated by prettier
    // is a guard that stops looking the first time somebody reformats a page.
    expect(checkStaleVenue('via Fratelli\n      Rosselli 12', FORMER_ADDRESSES)).toHaveLength(1);
    expect(checkStaleVenue('VIA FRATELLI ROSSELLI', FORMER_ADDRESSES)).toHaveLength(1);
  });

  it('reports every place it was copied to, not the first', () => {
    const twice = 'Fratelli Rosselli 12 — e più sotto, ancora Fratelli Rosselli';
    expect(checkStaleVenue(twice, FORMER_ADDRESSES)).toHaveLength(2);
  });

  it('has something to say only about what it was given', () => {
    expect(checkStaleVenue('Piazza Massaua 17/b', [])).toEqual([]);
    expect(checkStaleVenue('Piazza Massaua 17/b', ['Piazza Massaua'])).toHaveLength(1);
  });
});
