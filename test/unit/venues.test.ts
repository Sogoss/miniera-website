/* The one function that spells the address.
 *
 * The collection has held the address since the schema existed; what it did not
 * hold is how to write it out, and by PR 12 there were two spellings — one with
 * the city and one without. Neither is wrong on its own, which is why nothing
 * caught them: they are two answers to one question, and a reader who sees both
 * sees a site that is not sure where it is.
 */
import { describe, expect, it } from 'vitest';
import { fullAddress } from '../../src/lib/venues.ts';

const VENUE = {
  name: 'Palazzo ex Venchi Unica',
  address: 'Piazza Massaua 17/b',
  city: 'Torino',
};

describe('fullAddress', () => {
  it('spells the address one way', () => {
    expect(fullAddress(VENUE)).toBe('Palazzo ex Venchi Unica, Piazza Massaua 17/b, Torino');
  });

  it('trims what the frontmatter left around it', () => {
    expect(fullAddress({ name: ' Palazzo ', address: 'Piazza Massaua 17/b', city: 'Torino ' }))
      .toBe('Palazzo, Piazza Massaua 17/b, Torino');
  });

  it('refuses a venue with a hole in it instead of publishing the hole', () => {
    // `Palazzo ex Venchi Unica, , Torino` is a page that renders, publishes and
    // says nothing about being broken — the same reasoning as a cycle colour
    // that is not a hex, or a number with no country code.
    expect(() => fullAddress({ ...VENUE, city: '' })).toThrow(/city/);
    expect(() => fullAddress({ ...VENUE, address: '   ' })).toThrow(/address/);
  });

  it('names every part that is missing, not the first one', () => {
    expect(() => fullAddress({ name: '', address: '', city: 'Torino' })).toThrow(/name, address/);
  });
});
