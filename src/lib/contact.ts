/* The one place the association's number is written.
 *
 * There is no backend and none is needed: a seat is held by writing to the
 * president, who chose to publish his own number this way. What that makes of
 * this file is a piece of configuration with exactly one copy — a second one
 * written by hand in a component would be right the day it is typed and wrong
 * the day the number changes, with nothing failing in between. A guard over the
 * source says so out loud: `wa.me` and these digits are forbidden everywhere
 * else in src/.
 *
 * Pure, like events.ts, cycles.ts and shapes.ts: no imports, no clock, nothing
 * from astro:content. The links are built at build time and land in the markup
 * as ordinary `<a href>`, so they work for a reader with no scripting — which
 * is the whole of what PR 12 adds to the booking button.
 */

/** The president's number, in international form.
 *
 *  With the `+`, and that is not cosmetic: `whatsappDigits` refuses a number
 *  without it. A national number reaches wa.me as ten digits with no country
 *  code, where it either resolves to somebody else entirely or to nothing, and
 *  either way the link looks perfectly well formed. */
export const WHATSAPP_NUMBER = '+39 335 665 4599';

/** What the design left behind, and what must never be published.
 *
 *  Here rather than in the guard that hunts it, because the two numbers are one
 *  fact seen from two sides — which one is the site's — and the person who one
 *  day changes the line above is not the person who opens test/guards. It is
 *  still written in design-export/, which is the specification this site is
 *  translated from and not code that ships, so the way it reaches dist/ is
 *  somebody copying a line out of it. */
export const PLACEHOLDER_NUMBER = '+39 300 000 0000';

/* What can stand between the groups of a written number: a space, a dot, and
   the hyphen — each with the look-alike a word processor substitutes for it.
   Written as escapes and not as the characters themselves: a non-breaking space
   is indistinguishable on screen from an ordinary one, and a character class
   nobody can read is a character class nobody can check.

   Not «anything that is not a digit», which would read the coordinates of an
   SVG path as a telephone number. */
const SEPARATORS = /[ \u00a0.\-\u2010\u2011\u2013]/g;

/**
 * A number as wa.me wants it: digits only, country code first, no `+`.
 *
 * Throws rather than guessing. A malformed number does not fail anywhere else
 * — the link is built, the markup is valid, the button is pressable, and what
 * opens is a chat with nobody — so the build is the only place left that can
 * say it. Same reasoning as the cycle colour that is not six hex digits: the
 * generator refuses what it does not recognise instead of writing it out.
 */
export function whatsappDigits(number: string): string {
  const trimmed = number.trim();
  if (!trimmed.startsWith('+')) {
    throw new Error(
      `the WhatsApp number \`${number}\` has no country code: wa.me wants the international form, and without it the link opens a chat with whoever owns those digits somewhere else`,
    );
  }

  const digits = trimmed.slice(1).replace(SEPARATORS, '');
  if (!/^\d{8,15}$/.test(digits)) {
    throw new Error(
      `the WhatsApp number \`${number}\` is not a number: \`${digits}\` is what is left of it once the separators are out, and E.164 allows 8 to 15 digits`,
    );
  }

  return digits;
}

/**
 * A wa.me link carrying a message ready to send.
 *
 * `encodeURIComponent` and not a replacement written by hand: the message below
 * carries an em dash and Italian apostrophes, and the titles of the archive
 * carry whatever an editor writes.
 */
export function whatsappLink(message: string, number: string = WHATSAPP_NUMBER): string {
  return `https://wa.me/${whatsappDigits(number)}?text=${encodeURIComponent(message)}`;
}

/**
 * What the reader's message says before they have typed anything.
 *
 * It names the evening because more than one is open for booking at a time —
 * two or three, in a programme that runs weekly — and «vorrei prenotare» with
 * no date is a question the president has to ask back. What it deliberately
 * does not carry is the name and how many people: the panel asks for those, and
 * a message with blanks left in it is a form wearing a conversation's clothes.
 */
export function bookingMessage(number: number, title: string): string {
  return `Ciao! Vorrei prenotare un posto per la serata ${number} — ${title}.`;
}

/** The booking link of one evening, which is the only kind this site has. */
export function bookingLink(number: number, title: string): string {
  return whatsappLink(bookingMessage(number, title));
}
