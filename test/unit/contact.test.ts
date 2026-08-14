/* The number, and the links built from it.
 *
 * A pure module like events.ts, cycles.ts and shapes.ts, and tested the same
 * way: on the numbers, not on the markup. What it gets wrong does not fail
 * anywhere else — a malformed number makes a perfectly valid link to a chat
 * with nobody — so what is asserted here is that it refuses instead of guessing.
 */
import { describe, expect, it } from 'vitest';
import {
  PLACEHOLDER_NUMBER,
  WHATSAPP_NUMBER,
  bookingLink,
  bookingMessage,
  whatsappDigits,
  whatsappLink,
} from '../../src/lib/contact.ts';

describe('whatsappDigits', () => {
  it('keeps the digits and drops the way they are written', () => {
    expect(whatsappDigits('+39 335 665 4599')).toBe('393356654599');
    expect(whatsappDigits('+393356654599')).toBe('393356654599');
    expect(whatsappDigits('+39-335-665-4599')).toBe('393356654599');
    expect(whatsappDigits('+39.335.665.4599')).toBe('393356654599');
  });

  it('reads the separators a word processor substitutes', () => {
    // A non-breaking space and a non-breaking hyphen look exactly like the two
    // ASCII characters they replace, and a number pasted out of a document
    // carries them. Read as digits they would make the number four characters
    // too long, and this would refuse a number that is perfectly right.
    // Written as escapes for the same reason src/lib/contact.ts writes its
    // character class that way: an assertion nobody can read proves nothing.
    expect(whatsappDigits('+39\u00a0335\u00a0665\u00a04599')).toBe('393356654599');
    expect(whatsappDigits('+39\u2011335\u2011665\u20114599')).toBe('393356654599');
  });

  it('refuses a number with no country code', () => {
    // The one that does not look like a defect: `wa.me/3356654599` is a valid
    // address, and it reaches whoever owns those digits under some other
    // country code — or nobody.
    expect(() => whatsappDigits('335 665 4599')).toThrow(/country code/);
    expect(() => whatsappDigits('0039 335 665 4599')).toThrow(/country code/);
  });

  it('refuses what is not a number at all', () => {
    expect(() => whatsappDigits('+39 chiedere in sede')).toThrow(/not a number/);
    expect(() => whatsappDigits('+39 335')).toThrow(/E.164/);
    expect(() => whatsappDigits(`+${'3'.repeat(16)}`)).toThrow(/E.164/);
  });

  it('says which number it refused', () => {
    // The message is read by whoever pasted the number in, and it is the only
    // thing standing between them and a link nobody can answer.
    expect(() => whatsappDigits('335 665 4599')).toThrow(/335 665 4599/);
  });
});

describe('whatsappLink', () => {
  it('builds the address wa.me wants', () => {
    expect(whatsappLink('Ciao', '+39 335 665 4599')).toBe('https://wa.me/393356654599?text=Ciao');
  });

  it('encodes what an editor writes', () => {
    // Apostrophes, accents and the em dash of the booking message all reach
    // this from titles nobody here writes. Left raw they make an address that
    // is either broken or truncated at the first stray character.
    const message = "È l'ora — «casa» & co?";
    const link = whatsappLink(message, '+39 335 665 4599');
    expect(link).not.toMatch(/[ &«»]/);
    expect(decodeURIComponent(link.split('?text=')[1]!)).toBe(message);
  });

  it('defaults to the number the site publishes', () => {
    expect(whatsappLink('Ciao')).toContain(whatsappDigits(WHATSAPP_NUMBER));
  });
});

describe('bookingMessage', () => {
  it('names the evening it was opened from', () => {
    // More than one evening is bookable at a time, so «vorrei prenotare» with
    // no evening in it is a question the president has to ask back.
    const message = bookingMessage(82, 'Le case che restano');
    expect(message).toContain('82');
    expect(message).toContain('Le case che restano');
  });

  it('leaves the name and how many people to whoever is writing', () => {
    // The panel asks for both. A message with blanks in it is a form wearing a
    // conversation's clothes, and it arrives half filled in.
    expect(bookingMessage(82, 'Le case che restano')).not.toMatch(/\.\.\.|…|___/);
  });
});

describe('bookingLink', () => {
  it('carries the evening in the message and nothing in the address', () => {
    const link = bookingLink(82, 'Le case che restano');
    const [address, text] = link.split('?text=');
    expect(address).toBe(`https://wa.me/${whatsappDigits(WHATSAPP_NUMBER)}`);
    expect(decodeURIComponent(text!)).toBe(bookingMessage(82, 'Le case che restano'));
  });
});

describe('the two numbers', () => {
  it('are not the same one', () => {
    // The whole point of the second constant: it is what must never be
    // published, and it is written next to what must be — because the person
    // who one day changes the first does not open test/guards.
    expect(whatsappDigits(WHATSAPP_NUMBER)).not.toBe(whatsappDigits(PLACEHOLDER_NUMBER));
  });

  it('are both readable as numbers', () => {
    expect(whatsappDigits(PLACEHOLDER_NUMBER)).toBe('393000000000');
  });
});
