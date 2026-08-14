/* Guards over the text this site does not have yet.
 *
 * The institutional pages carry the design's structure and none of its prose:
 * a founding story, four people and four statistics that belong to no
 * association. What stands in for them is deliberately unmistakable — lorem
 * ipsum, `Nome Cognome`, `0000` — because the alternative is the failure this
 * repository exists to catch: a page that renders perfectly, says something
 * false, and fails nowhere.
 *
 * Obvious is not the same as safe, though, and three things are checked rather
 * than trusted.
 *
 * A placeholder that loses its mark stops being declared and starts being
 * content. The mark is a component — src/components/Placeholder.astro — so it
 * cannot be forgotten while the text is kept; what this reads is dist/, where
 * the two would have come apart.
 *
 * A placeholder written in a page instead of in the module is one the
 * replacement will miss. `src/lib/placeholder.ts` is where they all are, and
 * «all of them» is the property that makes replacing them one edit.
 *
 * And a placeholder must not survive the site getting an address of its own.
 * That is `checkNoPlaceholders`, armed by `site` in astro.config.mjs exactly as
 * `og:url` is: the day PR 15 sets the domain, this turns red and the only way
 * past it is the real text. Which is the point — a real domain with lorem ipsum
 * on it is the one thing worse than no domain. docs/questioni-aperte.md says so
 * where PR 15 will read it.
 */
import { elementsWith } from './document.ts';
import { stripMarkupComments } from './language.ts';
import { inComment, maskStrings } from './source.ts';
import { type Violation, lineNumber } from './types.ts';

const MARK = 'data-placeholder';

/** Every span of the page that is declared a placeholder. */
function markedRanges(markup: string): { from: number; to: number }[] {
  return elementsWith(markup, MARK).map(({ index, to }) => ({ from: index, to }));
}

/* Astro writes a valueless attribute as `data-placeholder="true"`, so what is
   published is not what the component's author typed. Both forms are the mark
   — which is why `elementsWith` reads the name and stops at what follows it. */

/**
 * A placeholder sentence published outside a marked block.
 *
 * `texts` is `placeholderTexts()`, passed in rather than imported: the module
 * that owns the sentences is the one that states them, and a fixture can hand
 * this something shorter.
 *
 * Compared with the whitespace left open, because markup wraps and a minifier
 * does not wrap where a person does. Entities are the caller's business — the
 * support layer decodes them, and the strings here carry apostrophes.
 */
export function checkPlaceholderText(
  markup: string,
  texts: readonly string[],
  path = 'the page',
): Violation[] {
  const clean = stripMarkupComments(markup);
  const marked = markedRanges(clean);
  const violations: Violation[] = [];

  for (const text of texts) {
    const pattern = new RegExp(
      text
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\s+/g, '\\s+'),
      'g',
    );

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(clean)) !== null) {
      const at = match.index;
      if (marked.some((range) => at >= range.from && at < range.to)) continue;

      violations.push({
        rule: 'placeholder',
        detail: `${path}:${lineNumber(clean, at)} publishes «${text.slice(0, 48)}…» outside a \`${MARK}\` block. Unmarked it reads as what the association says, and the frame and the chip that tell a reader otherwise are gone — wrap it in \`<Placeholder>\``,
      });
    }
  }

  return violations;
}

/**
 * A placeholder written somewhere other than the module that holds them.
 *
 * Not about tidiness: the reason they are all in one file is that replacing
 * them is then one edit and not a hunt, and a second home is where the sentence
 * nobody remembered survives into production.
 *
 * Comments do not count — a guard that reported the prose explaining the rule
 * is a guard somebody switches off, the same reasoning as the number and the
 * time zone.
 */
export function checkPlaceholderSource(
  source: string,
  texts: readonly string[],
  path: string,
): Violation[] {
  const masked = maskStrings(source);
  const violations: Violation[] = [];

  for (const text of texts) {
    const pattern = new RegExp(
      text.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'),
      'g',
    );

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) {
      if (inComment(masked, match.index)) continue;
      violations.push({
        rule: 'placeholder',
        detail: `${path}:${lineNumber(source, match.index)} writes a placeholder of its own. They live in src/lib/placeholder.ts, all of them, so that the day the association sends its text there is one file to empty`,
      });
    }
  }

  return violations;
}

/**
 * Any placeholder at all, which is what a published site may not have.
 *
 * Read off the mark and not off the sentences: by then the text may be
 * anything, and what says «this is not finished» is the block. Called with the
 * domain set and not before — see the head of this file.
 */
export function checkNoPlaceholders(markup: string, path = 'the page'): Violation[] {
  const clean = stripMarkupComments(markup);

  return elementsWith(clean, MARK).map(({ index }) => ({
    rule: 'placeholder',
    detail: `${path}:${lineNumber(clean, index)} publishes a \`${MARK}\` block, and this site now has a domain. Lorem ipsum under a real address is read as what the association says — the texts are in src/lib/placeholder.ts and this is the day they come out`,
  }));
}
