/* Guard over the one address this site publishes.
 *
 * The venue is in the `sedi` collection and its spelling is `fullAddress()`,
 * which is enough to keep the site saying one thing — as long as nobody writes
 * an address by hand. The one that gets written by hand is the design's:
 * `design-export/` is the specification this project translates from, it names
 * a different building in a different street, and it says so in five places.
 * Copied into a page it publishes an association that meets somewhere it has
 * never met, with nothing failing and no way to tell from the page.
 *
 * Read on both sides. In `src/` it is the copy being made; in `dist/` it is
 * every other way the string could arrive — a file in public/, a content file,
 * a component that builds the address out of parts.
 */
import { type Violation, lineNumber } from './types.ts';

/** A phrase as it might be written across a line break, or with odd spacing.
 *
 *  Whitespace is the one thing allowed to differ: markup wraps, and a guard
 *  that missed «Fratelli\n   Rosselli» would be a guard the prettier defeats.
 *  Case too — `FRATELLI ROSSELLI` in a heading is the same street. */
function loosely(phrase: string): RegExp {
  const escaped = phrase
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '\\s+');
  return new RegExp(escaped, 'gi');
}

/**
 * An address the site is not at.
 *
 * `addresses` is `FORMER_ADDRESSES` from src/lib/venues.ts, passed in rather
 * than imported so that the negative cases can hand it something else — and so
 * that the module which owns the fact is the one that states it.
 */
export function checkStaleVenue(
  text: string,
  addresses: readonly string[],
  path = 'the file',
): Violation[] {
  const violations: Violation[] = [];

  for (const address of addresses) {
    const pattern = loosely(address);
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      violations.push({
        rule: 'venue',
        detail: `${path}:${lineNumber(text, match.index)} writes «${match[0]}», which is the address of the design and not of this association. The venue is in src/content/sedi/ and is spelled by \`fullAddress()\` — everything else is a copy that was right in a mockup`,
      });
    }
  }

  return violations;
}
