/* The cycles, and the accent each of them paints its evenings with.
 *
 * The half of the domain that turns `src/content/cicli/` into CSS: the colour
 * an editor writes in a file becomes the `--accent` every component reads
 * through `[data-cycle="N"]`. Like events.ts this module imports nothing and
 * never asks what time it is — the entries arrive as plain objects from
 * programme.ts, which is the only file allowed to read a collection.
 *
 * The rules are emitted from the collection and from nowhere else. They used to
 * be five hand-written blocks in colors.css pointing at five tokens, and the two
 * halves never met: a colour changed in a file went nowhere, with nothing
 * failing. The five tokens are still declared there — they are the palette the
 * design was tuned on, and the reference for whoever picks a colour for a new
 * cycle — but no rule reads them any more. Keeping the hand-written rules as a
 * fallback would have meant two declarations of the same property at the same
 * specificity, decided by the order of the stylesheets: the day that order
 * changes, the old colour comes back and nothing says so.
 */

/** What this module needs of a cycle. The description travels past it. */
export type CycleLike = {
  /** The id astro:content gives the entry, so a message can name the file. */
  id: string;
  number: number;
  name: string;
  /** Six-digit hex, which is what the schema accepts. */
  color: string;
};

const HEX = /^#([0-9a-fA-F]{6})$/;

/**
 * `#00a9b0` → `0, 169, 176`, or null for anything else.
 *
 * The triple is not decoration: without color-mix() it is the only way to get a
 * transparent accent — `rgba(var(--accent-rgb), 0.16)` — and it is the half of
 * the pair nobody notices they have broken. Written next to the hex it comes
 * from, `checkRgbTriples` compares the two on every build; it could not while
 * `--accent-rgb` held `var(--cycle-N-rgb)`, a pointer the guard skips.
 */
export function rgbTriple(color: string): string | null {
  const match = HEX.exec(color.trim());
  if (!match) return null;

  const digits = match[1]!;
  return [0, 2, 4].map((at) => parseInt(digits.slice(at, at + 2), 16)).join(', ');
}

/**
 * The accent rules, one per cycle, in the order of their numbers.
 *
 * Ordered by number rather than by the order the collection was read in, so
 * that adding a file does not reshuffle the published CSS and the diff of a
 * build stays about what changed.
 *
 * Anything it does not recognise stops the build instead of being written out.
 * This text goes into a `<style>` through `set:html`, which escapes nothing:
 * what makes that safe is not the Zod schema upstream — schemas get widened —
 * but that only a six-digit hex and an integer ever leave here.
 */
export function cycleAccentCss(cycles: readonly CycleLike[]): string {
  return sortByNumber(cycles)
    .map((cycle) => {
      if (!Number.isInteger(cycle.number)) {
        throw new Error(
          `${name(cycle)} is numbered \`${cycle.number}\`, which is not a whole number: the number becomes a CSS selector and the attribute of an element`,
        );
      }

      const triple = rgbTriple(cycle.color);
      if (triple === null) {
        throw new Error(
          `${name(cycle)} has the colour \`${cycle.color}\`, which is not a six-digit hex like #f26419: this text is written into a <style> as it stands, so nothing unrecognised leaves here`,
        );
      }

      return `[data-cycle="${cycle.number}"] { --accent: ${cycle.color.trim().toLowerCase()}; --accent-rgb: ${triple}; }`;
    })
    .join('\n');
}

/**
 * Two cycles laying claim to the same number.
 *
 * The number is how a cycle is named in CSS, so twins emit two
 * `[data-cycle="3"]` rules and the last one wins: half the evenings take the
 * other cycle's colour and nothing fails. Zod cannot see it — each file is
 * valid on its own — and neither can the reference from an event, which
 * resolves by file name and is happy either way.
 *
 * Returns the problems as sentences; programme.ts turns them into a failed
 * build. Both twins are named, because which of the two is wrong is the
 * editor's call and not something to guess at here.
 */
export function findCycleNumberConflicts(cycles: readonly CycleLike[]): string[] {
  const problems: string[] = [];
  const seen = new Map<number, CycleLike>();

  for (const cycle of sortByNumber(cycles)) {
    const twin = seen.get(cycle.number);
    if (twin) {
      problems.push(
        `${name(twin)} and ${name(cycle)} are both numbered ${cycle.number}: the number is how a cycle is named in the CSS, so one accent rule would silently overwrite the other`,
      );
      continue;
    }
    seen.set(cycle.number, cycle);
  }

  return problems;
}

/* By number, then by id: with two cycles claiming one number the order of the
   files would otherwise decide which is named first in the message. */
function sortByNumber(cycles: readonly CycleLike[]): CycleLike[] {
  return [...cycles].sort(
    (a, b) => a.number - b.number || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}

/** A cycle named the way an editor will recognise it in the repository. */
function name(cycle: CycleLike): string {
  return `cycle #${cycle.number} «${cycle.name}» (${cycle.id})`;
}
