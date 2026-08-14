/* Guards over the one number the site publishes.
 *
 * There is no backend: a seat is held by writing to the president on WhatsApp,
 * and the whole booking is a link. Which makes the number a piece of
 * configuration that is right or wrong in exactly one way, and wrong in a way
 * nothing else can catch — a well-formed `wa.me` link pointing at the wrong
 * digits opens a chat with a stranger, or with nobody, and the page around it
 * is perfect.
 *
 * Two ways that happens, and one guard each. Somebody writes a second copy of
 * the link in a component, and the day the number changes only one of them
 * follows. Or somebody copies the line out of design-export/ — where the
 * placeholder `+39 300 000 0000` is still written, because that folder is the
 * specification this site is translated from — and publishes it.
 *
 * Both read numbers the way a person writes them rather than as a run of
 * digits: `+39 300 000 0000` and `393000000000` are the same number, and a
 * check that only knew one spelling would be satisfied by the other.
 */
import { inComment, maskStrings } from './source.ts';
import { type Violation, lineNumber } from './types.ts';

/* What a person puts between the groups of a number: a space, a dot, a hyphen,
   each with the look-alike a word processor substitutes for it. The same class
   src/lib/contact.ts uses, and deliberately not «anything that is not a digit»:
   that reads the coordinates of an SVG path as a telephone number. */
const SEPARATORS = ' \\u00a0.\\-\\u2010\\u2011\\u2013';

/** A run of digits and separators long enough to be a telephone number. */
const CANDIDATE = new RegExp(`\\+?\\d[\\d${SEPARATORS}]{6,}\\d`, 'g');

const SEPARATOR = new RegExp(`[${SEPARATORS}]+`);

/** Just the digits of a written number. */
export function digitsOf(number: string): string {
  return number.replace(/^\s*\+/, '').split(SEPARATOR).join('').trim();
}

/**
 * Every written telephone number in a text, with where it is.
 *
 * The one thing this refuses to call a number is a run whose groups are single
 * digits: `M 3 0 0 0 0 0 0 0 0 0` in an SVG path is ten digits and nine
 * separators, and it is not a telephone number in any notation anybody uses.
 * Without that rule this guard would report a drawing, and a guard that fires
 * on correct work is a guard somebody switches off.
 */
export function phoneNumbersIn(text: string): { digits: string; index: number }[] {
  const found: { digits: string; index: number }[] = [];
  CANDIDATE.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = CANDIDATE.exec(text)) !== null) {
    const token = match[0];
    const groups = token.replace(/^\+/, '').split(SEPARATOR);
    if (groups.some((group) => group.length < 2)) continue;

    const digits = groups.join('');
    if (digits.length < 8 || digits.length > 15) continue;
    found.push({ digits, index: match.index });
  }

  return found;
}

/* The longest country code there is, in digits — E.164 allows three. */
const COUNTRY_CODE = 3;

/**
 * Whether two written numbers are the same one.
 *
 * By the tail, because the country code is the part a spelling drops:
 * `300 000 0000` and `+39 300 000 0000` reach the same telephone, and a check
 * comparing them character for character would pass the shorter one through.
 *
 * But by the tail *and no further*: the two may differ by a country code and by
 * nothing else. Left as a bare `endsWith`, eight zeros anywhere in a published
 * file — `00 00 00 00` in the numbers of a transform, which passes the grouping
 * rule above — were a suffix of the placeholder `393000000000`, and the guard
 * would have reported a page for a drawing. Four digits of difference is not a
 * country code.
 */
function sameNumber(one: string, other: string): boolean {
  const [short, long] = one.length <= other.length ? [one, other] : [other, one];
  return long.endsWith(short) && long.length - short.length <= COUNTRY_CODE;
}

/**
 * The number is written in one place, and this is every other place.
 *
 * `src/lib/contact.ts` holds it and builds the links; nothing else in src/ may
 * write a `wa.me` address or those digits. A second copy is not a defect on the
 * day it is written — it is correct then, which is why it gets written — it is
 * a defect on the day the number changes and one of the two follows.
 *
 * Comments do not count, and that is not indulgence: a guard that reported the
 * prose explaining the rule would be reporting correct work, which is how a
 * guard gets switched off. The same reasoning, and the same two helpers, as the
 * guard over `timeZone` written inside a comment.
 */
export function checkWhatsappSource(source: string, number: string, path: string): Violation[] {
  const violations: Violation[] = [];
  const masked = maskStrings(source);
  const wanted = digitsOf(number);

  const links = /wa\.me|whatsapp\.com|whatsapp:\/\//gi;
  let match: RegExpExecArray | null;
  while ((match = links.exec(source)) !== null) {
    if (inComment(masked, match.index)) continue;
    violations.push({
      rule: 'contact',
      detail: `${path}:${lineNumber(source, match.index)} writes a WhatsApp address of its own. The number lives in src/lib/contact.ts and nowhere else, because a second copy is right the day it is typed and wrong the day the number changes — with nothing failing in between`,
    });
  }

  for (const { digits, index } of phoneNumbersIn(source)) {
    if (!sameNumber(digits, wanted)) continue;
    if (inComment(masked, index)) continue;
    violations.push({
      rule: 'contact',
      detail: `${path}:${lineNumber(source, index)} writes the association's number out. It is configuration, not content: src/lib/contact.ts holds it, and every link is built from there`,
    });
  }

  return violations;
}

/**
 * The address is written in one place too, and this is every other place.
 *
 * The same rule as the number above and for the same reason, with one thing
 * more: this address does not receive yet — the mailbox arrives with the
 * domain. A second copy of it is therefore a second thing to change on a day
 * when somebody is already changing the first, and the one that is forgotten
 * goes on offering a way of writing to nobody.
 *
 * Both halves are hunted, `mailto:` and the address itself, because they fail
 * apart: a link can be built without ever writing the address out — a
 * `mailto:` with a variable in it — and the address can be printed without a
 * link. Comments do not count, as above.
 */
export function checkEmailSource(source: string, email: string, path: string): Violation[] {
  const violations: Violation[] = [];
  const masked = maskStrings(source);

  const links = /mailto:/gi;
  let match: RegExpExecArray | null;
  while ((match = links.exec(source)) !== null) {
    if (inComment(masked, match.index)) continue;
    violations.push({
      rule: 'contact',
      detail: `${path}:${lineNumber(source, match.index)} builds a \`mailto:\` of its own. The address lives in src/lib/contact.ts and the links come from \`mailtoLink()\`, which also refuses what is not an address instead of writing it out`,
    });
  }

  const written = new RegExp(email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  while ((match = written.exec(source)) !== null) {
    if (inComment(masked, match.index)) continue;
    violations.push({
      rule: 'contact',
      detail: `${path}:${lineNumber(source, match.index)} writes the association's address out. It is configuration, like the number: one copy, in src/lib/contact.ts`,
    });
  }

  return violations;
}

/**
 * The placeholder of the design does not reach the reader.
 *
 * `+39 300 000 0000` is still written in design-export/, which is the
 * specification and not code that ships — so the way it arrives in dist/ is
 * somebody copying a line out of it. Published, it is a booking button that
 * opens a chat with a number belonging to nobody here, and there is nothing
 * about the page to suggest it.
 *
 * Pointed at what was published rather than at the source, because that is the
 * question: a placeholder in a fixture or in a test hurts nobody, and one in
 * dist/ is the whole defect.
 */
export function checkPlaceholderNumber(
  text: string,
  placeholder: string,
  path: string,
): Violation[] {
  const wanted = digitsOf(placeholder);

  return phoneNumbersIn(text)
    .filter(({ digits }) => sameNumber(digits, wanted))
    .map(({ index }) => ({
      rule: 'contact',
      detail: `${path}:${lineNumber(text, index)} publishes \`${placeholder}\`, which is the placeholder of the design and reaches nobody. The number is the president's and is written once, in src/lib/contact.ts`,
    }));
}
