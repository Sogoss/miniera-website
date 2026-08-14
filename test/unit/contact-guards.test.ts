/* Negative tests for the two guards over the number.
 *
 * Both are aimed at defects that leave no other trace: a second copy of the
 * link is correct the day it is written, and the placeholder of the design
 * publishes a booking button that opens a chat with nobody. Neither fails a
 * build, neither shows up on a page, and neither is visible in a screenshot.
 *
 * Several cases below are the guards failing *open* — still answering «nothing
 * to see» after they have stopped meaning anything — which is how this kind of
 * check dies.
 */
import { describe, expect, it } from 'vitest';
import {
  checkPlaceholderNumber,
  checkWhatsappSource,
  digitsOf,
  phoneNumbersIn,
} from '../guards/contact.ts';
import { whatsappDigits } from '../../src/lib/contact.ts';

const NUMBER = '+39 335 665 4599';
const PLACEHOLDER = '+39 300 000 0000';

describe('phoneNumbersIn', () => {
  it('reads a number however it is written', () => {
    for (const spelling of [
      '+39 335 665 4599',
      '+393356654599',
      '393356654599',
      '335 665 4599',
      '335-665-4599',
      '335.665.4599',
    ]) {
      const found = phoneNumbersIn(`scrivi a ${spelling} per prenotare`);
      expect(found, `«${spelling}» was not read as a number`).toHaveLength(1);
      expect(found[0]!.digits.endsWith('3356654599')).toBe(true);
    }
  });

  it('does not read an SVG path as a telephone number', () => {
    // The reason the separators are a list and not «anything that is not a
    // digit»: a path is digits and spaces, and a guard that reported a drawing
    // is a guard somebody switches off. Ten digits, nine spaces, no telephone.
    expect(phoneNumbersIn('<path d="M 3 0 0 0 0 0 0 0 0 0" />')).toEqual([]);
  });

  it('does not read a date as a telephone number', () => {
    // `2026-08-14` survives the group rule — three groups, all of them two
    // digits or more — so what keeps it out of a report is that it is compared
    // against a number and does not match one. Asserted here so that the day
    // somebody widens the comparison, this says what it costs.
    const found = phoneNumbersIn('<time datetime="2026-08-14">');
    expect(found.map((one) => one.digits)).toEqual(['20260814']);
    expect(checkPlaceholderNumber('<time datetime="2026-08-14">', PLACEHOLDER, 'x')).toEqual([]);
  });

  it('leaves a run of digits that is too short or too long to be one', () => {
    expect(phoneNumbersIn('sono in 12 34 in sala')).toEqual([]);
    expect(phoneNumbersIn(`id="${'9'.repeat(16)}"`)).toEqual([]);
  });

  it('says where it found one', () => {
    const text = 'riga uno\nscrivi a +39 335 665 4599';
    expect(phoneNumbersIn(text)[0]!.index).toBe(text.indexOf('+39'));
  });
});

describe('digitsOf', () => {
  it('drops the prefix and the separators and nothing else', () => {
    expect(digitsOf('+39 335 665 4599')).toBe('393356654599');
    expect(digitsOf('393356654599')).toBe('393356654599');
  });

  it('reads a number exactly as src/lib/contact.ts reads it', () => {
    // Two copies of one character class — the module's and the guard's — and
    // on purpose: a guard that imported the module it guards would go blind
    // together with it. What the two copies must not do is drift. A separator
    // added to the module and not here leaves the guard silently not
    // recognising a spelling the module accepts, which is the number written a
    // second time and no violation reported: this guard failing open, which is
    // the one way it dies quietly. Asserted on every separator either of them
    // knows.
    // Written as escapes, for the reason both files write their class that
    // way: a non-breaking space is indistinguishable on screen from an
    // ordinary one, and an assertion nobody can read proves nothing.
    for (const spelling of [
      '+39 335 665 4599',
      '+39\u00a0335\u00a0665\u00a04599',
      '+39.335.665.4599',
      '+39-335-665-4599',
      '+39\u2010335\u2010665\u20104599',
      '+39\u2011335\u2011665\u20114599',
      '+39\u2013335\u2013665\u20134599',
      '+393356654599',
    ]) {
      expect(digitsOf(spelling), `«${spelling}»`).toBe(whatsappDigits(spelling));
    }
  });
});

describe('checkWhatsappSource', () => {
  it('passes a component that asks the domain for the link', () => {
    const source = `<a href={scene.bookingUrl} target="_blank" rel="noopener">Scrivi</a>`;
    expect(checkWhatsappSource(source, NUMBER, 'src/components/Scene.astro')).toEqual([]);
  });

  it('reports an address written by hand', () => {
    // The whole defect: correct the day it is typed, wrong the day the number
    // changes, and nothing in between says so.
    const source = `const link = 'https://wa.me/393356654599';`;
    const violations = checkWhatsappSource(source, NUMBER, 'src/components/Scene.astro');
    expect(violations.length).toBeGreaterThanOrEqual(1);
    expect(violations[0]!.rule).toBe('contact');
    expect(violations[0]!.detail).toContain('src/lib/contact.ts');
  });

  it('reports the other addresses that reach the same chat', () => {
    // `wa.me` is the short one, not the only one: a link copied out of a
    // browser is `api.whatsapp.com/send?phone=…`, and a link copied out of the
    // desktop application is `whatsapp://`.
    for (const address of [
      `const l = 'https://api.whatsapp.com/send?phone=393356654599';`,
      `const l = 'https://web.whatsapp.com/send?phone=393356654599';`,
      `const l = 'whatsapp://send?phone=393356654599';`,
    ]) {
      expect(checkWhatsappSource(address, NUMBER, 'src/pages/contatti.astro').length)
        .toBeGreaterThanOrEqual(1);
    }
  });

  it('reports the number written out without a link at all', () => {
    // The page of PR 13 will want to print it, and printing it is the same
    // second copy as linking it.
    const source = `<p>Scrivi al 335 665 4599</p>`;
    const violations = checkWhatsappSource(source, NUMBER, 'src/pages/contatti.astro');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('configuration');
  });

  it('follows the number it is given, not one written into it', () => {
    // Pointed at the module's own constant by the caller. A number written
    // here would be the second copy this guard exists to forbid, one folder
    // further out.
    const source = `<p>Scrivi al +41 79 123 4567</p>`;
    expect(checkWhatsappSource(source, NUMBER, 'x')).toEqual([]);
    expect(checkWhatsappSource(source, '+41 79 123 4567', 'x')).toHaveLength(1);
  });

  it('leaves the prose that explains the rule alone', () => {
    // A guard that reported the comment describing it would be firing on
    // correct work, and one of those gets switched off. Both comment shapes,
    // because .astro writes the second one.
    const line = `// the wa.me link of 335 665 4599 is built in src/lib/contact.ts\n`;
    const block = `{/* it carries the wa.me link, built from 335 665 4599 */}\n`;
    expect(checkWhatsappSource(line, NUMBER, 'src/lib/programme.ts')).toEqual([]);
    expect(checkWhatsappSource(block, NUMBER, 'src/components/Programme.astro')).toEqual([]);
  });

  it('still reads the code under a comment that mentions it', () => {
    // The other half of the same question: masking must not switch the guard
    // off for the rest of the file.
    const source = `// the wa.me link is built in src/lib/contact.ts\nconst l = 'https://wa.me/393356654599';`;
    expect(checkWhatsappSource(source, NUMBER, 'src/components/Scene.astro')).toHaveLength(2);
  });
});

describe('checkPlaceholderNumber', () => {
  it('passes a page that publishes the real number', () => {
    const html = `<a href="https://wa.me/393356654599?text=Ciao">Prenota</a>`;
    expect(checkPlaceholderNumber(html, PLACEHOLDER, 'dist/index.html')).toEqual([]);
  });

  it('reports the placeholder however it was copied', () => {
    // Every spelling the design and a hurried paste can produce. Compact is
    // the one a link carries; spaced is the one a page prints.
    for (const spelling of [
      '+39 300 000 0000',
      '+393000000000',
      '393000000000',
      '300 000 0000',
      '3000000000',
      '300-000-0000',
    ]) {
      const html = `<p>Scrivi al ${spelling}</p>`;
      const violations = checkPlaceholderNumber(html, PLACEHOLDER, 'dist/contatti/index.html');
      expect(violations, `«${spelling}» went through`).toHaveLength(1);
      expect(violations[0]!.rule).toBe('contact');
      expect(violations[0]!.detail).toContain('dist/contatti/index.html');
    }
  });

  it('does not call eight zeros a telephone number', () => {
    // `00 00 00 00` groups in twos, so the rule above lets it through as a
    // written number — and it is a suffix of `393000000000`. Compared by the
    // tail alone, a `matrix(1, 0, 0, 1, 00 00, 00 00)` or any other run of
    // grouped zeros in a published file was reported as the placeholder: a
    // guard firing on a drawing, which is the kind that gets switched off.
    // What separates two spellings of one number is a country code, and a
    // country code is at most three digits.
    expect(checkPlaceholderNumber('<p>00 00 00 00</p>', PLACEHOLDER, 'x')).toEqual([]);
    expect(checkPlaceholderNumber('<p>00000000</p>', PLACEHOLDER, 'x')).toEqual([]);
    // And the spellings that really are the placeholder still are.
    expect(checkPlaceholderNumber('<p>000 000 0000</p>', PLACEHOLDER, 'x')).toEqual([]);
    expect(checkPlaceholderNumber('<p>300 000 0000</p>', PLACEHOLDER, 'x')).toHaveLength(1);
  });

  it('reports it inside a link, which is where it does the damage', () => {
    const html = `<a href="https://wa.me/393000000000?text=Ciao">Prenota il posto</a>`;
    expect(checkPlaceholderNumber(html, PLACEHOLDER, 'dist/index.html')).toHaveLength(1);
  });

  it('names the line, so the page is not searched by hand', () => {
    const html = `<p>una riga</p>\n<p>un'altra</p>\n<p>+39 300 000 0000</p>`;
    expect(checkPlaceholderNumber(html, PLACEHOLDER, 'dist/index.html')[0]!.detail).toContain(':3');
  });
});
