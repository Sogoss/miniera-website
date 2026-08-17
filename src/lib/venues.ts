/* The address of a venue, written out in one place.
 *
 * The `sedi` collection has held the address since the schema existed, and
 * that was already enough to say the site has one source for it. It was not:
 * the *spelling* was being composed by whoever printed it, and by PR 12 there
 * were two of them — `Scene.astro` wrote name, street and city, the component
 * gallery wrote name and street. Neither is wrong; they are two answers to
 * «what is the address of this place», and a reader who sees both sees a site
 * that is not sure.
 *
 * This PR would have added two more, on the two pages whose whole job is to
 * say where the association is. So the composition moves here, next to the
 * other decision of the same shape: `contact.ts` holds the number because a
 * second copy is right the day it is typed and wrong the day it changes.
 *
 * Pure, like events.ts, cycles.ts, shapes.ts and contact.ts: no imports, no
 * clock, nothing from astro:content. What it takes is the three fields of the
 * collection and not the entry, so that a test can hand it a venue that does
 * not exist.
 */

/** The address of the design, which is not the address of this association.
 *
 *  The export writes it three ways — «Circolo di via Fratelli Rosselli 12», the
 *  same with the tram and the courtyard after it, and the bare «Circolo di via
 *  Fratelli Rosselli» — and what the three have in common is a street the
 *  association has never been in. Kept here rather than in the guard that hunts
 *  it, like `PLACEHOLDER_NUMBER` in contact.ts: it is one fact seen from two
 *  sides — which address is ours — and the person who one day changes the
 *  collection is not the person who opens test/guards.
 *
 *  design-export/ is the specification this site is translated from, so the way
 *  this reaches a page is somebody copying a line out of it, exactly as with
 *  the telephone placeholder. */
export const FORMER_ADDRESSES = ['Fratelli Rosselli'];

/** The three fields of a venue that make up an address. */
export type VenueLike = {
  name: string;
  address: string;
  city: string;
};

/**
 * `Palazzo ex Venchi Unica, Piazza Massaua 17/b, Torino` — the one spelling.
 *
 * Refuses a blank part rather than writing it out, for the same reason the
 * cycle generator refuses a colour that is not a hex and `whatsappDigits`
 * refuses a number with no country code: `Palazzo ex Venchi Unica, , Torino`
 * is a page that renders, publishes and says nothing about being broken. The
 * schema already asks for all three — this is what happens when a venue
 * reaches here another way.
 */
export function fullAddress(venue: VenueLike): string {
  const { name, where } = venueLines(venue);
  return `${name}, ${where}`;
}

/**
 * The same address in its two halves: what the place is called, and where it
 * is. A scene sets them on two lines — the name above, the street and the city
 * under it — because on a phone the one line wrapped wherever it happened to
 * run out, which put «Piazza Massaua 17/b,» and «Torino» on either side of a
 * break that means nothing.
 *
 * Two halves of one composition and not a second one: `fullAddress` is written
 * out of this, so the refusal below covers both and the day a venue grows a
 * field there is one place to add it. Rule 19 is that the spelling lives in a
 * single place, not that there is a single spelling: what it forbids is two
 * *unrelated* answers to «what is the address of this place».
 */
export function venueLines(venue: VenueLike): { name: string; where: string } {
  const parts = [venue.name, venue.address, venue.city].map((part) => part?.trim() ?? '');

  const missing = ['name', 'address', 'city'].filter((_, at) => parts[at] === '');
  if (missing.length > 0) {
    throw new Error(
      `the venue \`${venue.name || '(senza nome)'}\` has no ${missing.join(', ')}: an address with a hole in it publishes as a stray comma and nothing else fails`,
    );
  }

  return { name: parts[0]!, where: `${parts[1]}, ${parts[2]}` };
}
