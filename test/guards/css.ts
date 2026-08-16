/* Guards over CSS.
 *
 * Every guard takes a string and returns the list of violations it found.
 * That signature is what makes the negative tests possible: a test hands in a
 * hand-written broken stylesheet and asserts the violation is reported. The
 * alternative — actually breaking the tokens and running a bad build — is not
 * repeatable in CI.
 *
 * The same functions run against both the source and the minified CSS in
 * dist/, which writes `--scene-height:100vh` with no space after the colon, so
 * the patterns below tolerate either spacing.
 */
import { type Violation, lineNumber } from './types.ts';

/* --- Parsing helpers ---------------------------------------------------- */

/** Blanks out comments, which would otherwise throw off brace matching. */
export function stripComments(css: string): string {
  // Newlines are preserved so reported line numbers stay accurate.
  return css.replace(/\/\*[\s\S]*?\*\//g, (comment) =>
    comment.replace(/[^\n]/g, ' '),
  );
}

export type SupportsBlock = {
  condition: string;
  body: string;
  index: number;
};

/**
 * Splits CSS into what sits inside an `@supports` block and what sits outside.
 *
 * The fallback guard needs this: "declared outside" and "raised inside" are
 * two different claims, and a double declaration in a single block — the shape
 * the minifier collapses — must not be able to pass for a valid fallback.
 */
export function splitSupports(css: string): {
  outside: string;
  blocks: SupportsBlock[];
} {
  const blocks: SupportsBlock[] = [];
  const lower = css.toLowerCase();
  let outside = '';
  let i = 0;

  while (i < css.length) {
    const start = lower.indexOf('@supports', i);
    if (start === -1) {
      outside += css.slice(i);
      break;
    }

    outside += css.slice(i, start);

    const open = css.indexOf('{', start);
    if (open === -1) {
      // An `@supports` with no body is malformed CSS and not this function's
      // problem. Treat it as ordinary text and move on.
      outside += css.slice(start);
      break;
    }

    let depth = 1;
    let j = open + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') depth--;
      j++;
    }

    blocks.push({
      condition: css.slice(start + '@supports'.length, open).trim(),
      body: css.slice(open + 1, depth === 0 ? j - 1 : css.length),
      index: start,
    });

    i = j;
  }

  return { outside, blocks };
}

/** Bodies of the innermost blocks: declarations live there and nowhere else. */
export function innermostBlocks(css: string): { body: string; index: number }[] {
  const blocks: { body: string; index: number }[] = [];
  const pattern = /\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(css)) !== null) {
    blocks.push({ body: match[1] ?? '', index: match.index });
  }
  return blocks;
}

/** Every value assigned to the custom property `name`. */
function valuesOf(css: string, name: string): string[] {
  const pattern = new RegExp(`--${name}\\s*:\\s*([^;}]+)`, 'g');
  const values: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(css)) !== null) {
    values.push((match[1] ?? '').trim());
  }
  return values;
}

const VH_ONLY = /^\d+(?:\.\d+)?vh$/;
const SVH_ONLY = /^\d+(?:\.\d+)?svh$/;

/* --- Rules 4 and 5: the scene-height fallback --------------------------- */

/**
 * The failure that already happened for real: the minifier collapses the
 * double declaration and `--scene-height: 100vh` vanishes from the published
 * file without the source changing. This guard reads the published file, which
 * is the only place the loss is visible.
 *
 * The token name stays a parameter. It was one because the tokens were still
 * Italian and a rename was coming; the rename happened in PR 2 and cost this
 * guard one default value, which is the argument for leaving it that way.
 */
export function checkSceneHeightFallback(
  css: string,
  token = 'scene-height',
): Violation[] {
  const violations: Violation[] = [];
  const clean = stripComments(css);
  const { outside, blocks } = splitSupports(clean);

  const outsideValues = valuesOf(outside, token);

  if (!outsideValues.some((value) => VH_ONLY.test(value))) {
    violations.push({
      rule: 'rule 4',
      detail: `the \`vh\` fallback for \`--${token}\` is missing outside @supports: below Safari 15.4 the token has no value at all`,
    });
  }

  if (outsideValues.some((value) => SVH_ONLY.test(value))) {
    violations.push({
      rule: 'rule 4',
      detail: `\`--${token}\` is declared in \`svh\` outside @supports: that is the double declaration the minifier collapses, so the fallback never reaches production`,
    });
  }

  const raised = blocks.filter(
    (block) =>
      /height\s*:\s*100svh/i.test(block.condition) &&
      valuesOf(block.body, token).some((value) => SVH_ONLY.test(value)),
  );

  if (raised.length === 0) {
    violations.push({
      rule: 'rule 4',
      detail: `the \`@supports (height: 100svh)\` block that raises \`--${token}\` to \`100svh\` is missing`,
    });
  }

  // Rule 5: `dvh` must not appear anywhere. With dvh the viewport height
  // changes as Safari's address bar retracts and the snap positions jump.
  const dvh = /\d+(?:\.\d+)?dvh\b/g;
  let match: RegExpExecArray | null;
  while ((match = dvh.exec(clean)) !== null) {
    violations.push({
      rule: 'rule 5',
      detail: `\`${match[0]}\` on line ${lineNumber(clean, match.index)}: use \`svh\`, not \`dvh\``,
    });
  }

  return violations;
}

/* --- Rule 3, first half: no color-mix() and no oklch() ------------------ */

export function checkNoColorMixOrOklch(css: string): Violation[] {
  const violations: Violation[] = [];
  const clean = stripComments(css);

  for (const fn of ['color-mix', 'oklch']) {
    const pattern = new RegExp(`\\b${fn}\\s*\\(`, 'gi');
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(clean)) !== null) {
      violations.push({
        rule: 'rule 3',
        detail: `\`${fn}(\` on line ${lineNumber(clean, match.index)}: both were removed from the tokens to lower the browser floor`,
      });
    }
  }

  return violations;
}

/* --- Rule 3, second half: the --*-rgb triples --------------------------- */

/** Expands #abc to #aabbcc and returns the three channels. */
function channels(hex: string): [number, number, number] | null {
  const digits = hex.slice(1);
  const full =
    digits.length === 3 || digits.length === 4
      ? digits
          .slice(0, 3)
          .split('')
          .map((d) => d + d)
          .join('')
      : digits.slice(0, 6);
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

const LITERAL_TRIPLE = /^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/;

/**
 * Every `--name: #hex` declaration in a chunk of CSS, in source order.
 *
 * The lookahead accepts the end of the string as well as `;` and `}` because
 * this runs over the *body* of a block, where the last declaration has neither.
 */
function baseColors(css: string): [string, string][] {
  const found: [string, string][] = [];
  const pattern = /--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*(?=[;}]|$)/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(css)) !== null) {
    found.push([match[1]!, match[2]!]);
  }
  return found;
}

/**
 * Every colour used with transparency carries its own `--*-rgb` triple,
 * because there is no color-mix() to derive it. The two are the same fact
 * written twice: change the colour and forget the triple and nothing breaks —
 * it just drifts, which is the half nobody notices they have broken.
 *
 * Iteration goes **from the triples to the hex values**, never the other way:
 * a dozen colours (--blue-800, the --orange-*, --black, the --status-*) have no
 * triple and are not supposed to have one.
 *
 * A colour is resolved **inside the block its triple sits in**, not across the
 * whole stylesheet. The same name is legitimately declared more than once —
 * `[data-theme="paper"]` already redeclares several, and the per-cycle accent
 * rules will declare one --accent each — so a flat file-wide index would
 * compare every triple against whichever declaration happened to come last and
 * report drift that is not there. The file-wide index survives only as a
 * fallback, and only where the whole file agrees on one value: guessing
 * between two would be the same mistake in a quieter form.
 */
export function checkRgbTriples(css: string): Violation[] {
  const violations: Violation[] = [];
  const clean = stripComments(css);
  const blocks = innermostBlocks(clean);

  const elsewhere = new Map<string, Set<string>>();
  for (const { body } of blocks) {
    for (const [name, hex] of baseColors(body)) {
      const seen = elsewhere.get(name) ?? new Set<string>();
      seen.add(hex.toLowerCase());
      elsewhere.set(name, seen);
    }
  }

  for (const { body } of blocks) {
    const local = new Map(baseColors(body));

    const triplePattern = /--([a-z0-9-]+)-rgb\s*:\s*([^;}]+)/g;
    let triple: RegExpExecArray | null;
    while ((triple = triplePattern.exec(body)) !== null) {
      const name = triple[1]!;
      const value = (triple[2] ?? '').trim();

      // --accent-rgb holds `var(--cycle-N-rgb)`: a pointer, not a triple. It
      // has to be skipped, otherwise parseInt yields NaN and the guard passes
      // for the wrong reason.
      const parts = LITERAL_TRIPLE.exec(value);
      if (!parts) continue;

      const shared = elsewhere.get(name);
      const hex =
        local.get(name) ?? (shared?.size === 1 ? [...shared][0] : undefined);

      if (!hex) {
        /* No colour beside the triple, and no single answer elsewhere either.
           This used to `continue` in silence when the name was declared with
           several different values, on the grounds that inventing one would
           report a drift that may not exist — but silence is the worse of the
           two answers, and PR 4 turned this branch from a curiosity into the
           common case: the emitted rules put one `--accent: #hex` per cycle, so
           `--accent` now has several values file-wide and every stray
           `--accent-rgb` written without its colour lands here. That is exactly
           the pair the scroller of PR 7 will write per scene, and it was being
           waved through. So it says what it can: not that the triple is wrong,
           but that nothing can check it. */
        violations.push({
          rule: 'rule 3',
          detail:
            shared && shared.size > 1
              ? `the triple \`--${name}-rgb\` has no \`--${name}\` in its own block, and \`--${name}\` is declared with ${shared.size} different values elsewhere: there is nothing to compare it against. Write the colour next to the triple`
              : `the triple \`--${name}-rgb\` has no hex base colour \`--${name}\``,
        });
        continue;
      }

      const expected = channels(hex);
      if (!expected) {
        violations.push({
          rule: 'rule 3',
          detail: `\`--${name}: ${hex}\` is not a readable hex value`,
        });
        continue;
      }

      const declared: [number, number, number] = [
        Number(parts[1]),
        Number(parts[2]),
        Number(parts[3]),
      ];

      if (
        expected[0] !== declared[0] ||
        expected[1] !== declared[1] ||
        expected[2] !== declared[2]
      ) {
        violations.push({
          rule: 'rule 3',
          detail: `\`--${name}\` is ${hex}, i.e. ${expected.join(', ')}, but \`--${name}-rgb\` declares ${declared.join(', ')}`,
        });
      }
    }
  }

  return violations;
}

/* --- Reading declarations ------------------------------------------------ */

/**
 * Every `property: value` pair in a chunk of CSS, with where it starts.
 *
 * The one place this file decides what a declaration looks like. It used to be
 * three: one scanner for the custom properties, one inside the duplicate check,
 * one for the values — three regular expressions encoding the same notion with
 * slightly different capture groups. A correction to that notion — `!important`,
 * a value carrying braces, nesting — had to land in three places, and the guard
 * whose copy was missed would keep passing while quietly seeing less of the
 * stylesheet than the others.
 *
 * A declaration is recognised after `{`, `;` or the start of the text, which is
 * what keeps a selector or an at-rule from being read as one.
 */
export function declarations(css: string): {
  property: string;
  value: string;
  index: number;
}[] {
  const found: { property: string; value: string; index: number }[] = [];
  const pattern = /(?:^|[;{])\s*(--[a-z0-9-]+|[a-z-]+)\s*:\s*([^;{}]*)/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(css)) !== null) {
    found.push({
      property: match[1]!,
      value: match[2] ?? '',
      index: match.index,
    });
  }
  return found;
}

/* --- Every var() finds its declaration ---------------------------------- */

/** Every custom property *declared* in a chunk of CSS. */
function declaredProperties(css: string): Set<string> {
  return new Set(
    declarations(css)
      .map(({ property }) => property)
      .filter((property) => property.startsWith('--')),
  );
}

/**
 * Every custom property *read* through `var()`, and whether the reading
 * carries a fallback.
 *
 * `var(--accent, var(--orange-500))` is legitimate even where `--accent` is
 * undefined — that is what a fallback is for — so those readings are not
 * reported.
 */
function usedProperties(css: string): { name: string; index: number }[] {
  const used: { name: string; index: number }[] = [];
  const pattern = /var\(\s*(--[a-z0-9-]+)\s*([,)])/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(css)) !== null) {
    if (match[2] === ',') continue;
    used.push({ name: match[1]!, index: match.index });
  }
  return used;
}

/**
 * A `var(--x)` whose `--x` is declared nowhere is the quiet half of a rename.
 *
 * Nothing complains about it: Astro compiles, `astro check` has nothing to say,
 * the CSS ships, and the property simply has no value — the border loses its
 * colour and somebody notices months later. It is the same shape of defect as
 * the collapsed fallback, which is why it belongs here and not in a review
 * checklist.
 *
 * Declarations are collected across the whole text handed in, so this has to
 * be given **all** the CSS at once — dist/ on the build layer, the stylesheets
 * and the component `<style>` blocks concatenated on the source layer. Given
 * one file at a time it would report every token as undefined.
 *
 * Scope is not modelled: a property declared under `[data-cycle="2"]` counts
 * as declared everywhere. Narrowing that would mean resolving the cascade,
 * and the defect being hunted here is a name that exists nowhere at all.
 */
export function checkUndefinedCustomProperties(css: string): Violation[] {
  const clean = stripComments(css);
  const declared = declaredProperties(clean);

  const reported = new Set<string>();
  const violations: Violation[] = [];

  for (const { name, index } of usedProperties(clean)) {
    if (declared.has(name) || reported.has(name)) continue;
    reported.add(name);
    violations.push({
      rule: 'tokens',
      detail: `\`var(${name})\` on line ${lineNumber(clean, index)} reads a custom property that is declared nowhere: it resolves to nothing, silently. Either the declaration is missing or the name was left behind by a rename`,
    });
  }

  return violations;
}

/* --- The browser floor, in the published file --------------------------- */

/**
 * A media query written in the range syntax — `(width <= 900px)`.
 *
 * Not something anybody types here: it is what the minifier *rewrites*
 * `(max-width: 900px)` into when it is not told which browsers to keep. The
 * range syntax is Safari 16.4, and the floor of this project is 15.4 — where
 * `svh` arrives — so between those two versions every media query of the
 * scroller is ignored: an iPhone gets the two-column desktop layout on a 390px
 * screen, the source says exactly the right thing, and nothing fails.
 *
 * It is the collapsed `@supports` fallback of rule 4 in another disguise, and
 * it is why this reads the published CSS rather than the source: at the source
 * there is nothing to see.
 */
export function checkMediaRangeSyntax(
  css: string,
  path = 'the published CSS',
): Violation[] {
  const clean = stripComments(css);
  const violations: Violation[] = [];

  const queries = /@media([^{]*)\{/gi;
  let match: RegExpExecArray | null;

  while ((match = queries.exec(clean)) !== null) {
    const condition = match[1] ?? '';
    if (!/[<>]=?/.test(condition)) continue;
    violations.push({
      rule: 'browser floor',
      detail: `\`@media${condition.trimEnd()}\` on line ${lineNumber(clean, match.index)} of ${path} uses the range syntax, which browsers understand from Safari 16.4 — the floor of this project is 15.4, so between the two the query simply does not apply. Nobody writes this by hand: it is the minifier rewriting \`max-width\`, and it means the build targets are not set`,
    });
  }

  return violations;
}

/* --- Rule 2, in the components: no raw colour values --------------------- */

/**
 * A value with the parts that only *look* like colours taken out: the name of
 * every `var()`, the quoted strings, the `url()`s. Brackets balanced.
 *
 * All three have an ordinary reason to look like a colour and none of them is
 * one: `var(--weight-black)` carries the word black, `'Archivo Black'` carries
 * it in a font name, `url(#clip-…)` starts with a hash.
 *
 * The **fallback** of a `var()` is kept and read, which is the whole difference
 * between this and throwing the reading away: `var(--accent, #f26419)` is a hex
 * typed into a component like any other — and it is the form the export writes,
 * `var(--accento, var(--arancio-500))`, so it is the one most likely to be
 * copied across. Kept recursively, because a fallback can hold another var().
 */
function withoutIndirection(value: string): string {
  let out = '';
  let i = 0;

  while (i < value.length) {
    const quote = value[i];
    if (quote === '"' || quote === "'") {
      const end = value.indexOf(quote, i + 1);
      i = end === -1 ? value.length : end + 1;
      continue;
    }

    const opener = /^(var|url)\s*\(/i.exec(value.slice(i));
    if (opener) {
      const open = i + opener[0].length;
      let depth = 1;
      let comma = -1;
      let j = open;
      for (; j < value.length && depth > 0; j++) {
        if (value[j] === '(') depth++;
        else if (value[j] === ')') depth--;
        else if (value[j] === ',' && depth === 1 && comma === -1) comma = j;
      }

      const end = depth === 0 ? j - 1 : value.length;
      if (opener[1]!.toLowerCase() === 'var' && comma !== -1) {
        out += ` ${withoutIndirection(value.slice(comma + 1, end))} `;
      }
      i = end + 1;
      continue;
    }

    out += value[i];
    i++;
  }

  return out;
}

/* The colour words this design system could plausibly reach for. Not a
   dictionary of the 148 CSS names: the ones left out are the ones nobody types
   by accident, and a longer list buys nothing while costing a false positive on
   every value that happens to contain `tan` or `plum`. */
const COLOUR_WORDS = new Set([
  'aqua', 'beige', 'black', 'blue', 'brown', 'coral', 'crimson', 'cyan', 'gold',
  'gray', 'green', 'grey', 'indigo', 'ivory', 'lime', 'magenta', 'maroon',
  'navy', 'olive', 'orange', 'orchid', 'pink', 'purple', 'red', 'salmon',
  'silver', 'teal', 'violet', 'wheat', 'white', 'yellow',
]);

/**
 * A colour written into a component instead of taken from the tokens.
 *
 * Rule 2: style is written with the tokens in `src/styles/tokens/`. A hex
 * typed into a component is not wrong on the screen the day it is typed — it is
 * wrong six months later, when the token it duplicates is retuned and this one
 * is not. Nothing fails: one border keeps the old blue.
 *
 * `rgba(var(--cream-100-rgb), 0.68)` is *the* prescribed form for transparency
 * — CLAUDE.md rule 3 — so it has to pass, and it does: the `var()` is removed
 * before anything is read, which leaves no literal channel behind. So do
 * `transparent`, `currentColor` and the keywords, which name no colour of their
 * own.
 *
 * Meant for the components, not for the tokens: `--blue-700: #003049` is a
 * declaration of the palette and the one place a hex belongs.
 */
export function checkRawColourValues(css: string, path = 'the component'): Violation[] {
  const clean = stripComments(css);
  const violations: Violation[] = [];
  const reported = new Set<string>();

  const report = (found: string, index: number) => {
    if (reported.has(found)) return;
    reported.add(found);
    violations.push({
      rule: 'rule 2',
      detail: `\`${found}\` on line ${lineNumber(clean, index)} of ${path} is a colour written by hand: style is written with the tokens of src/styles/tokens/, so that retuning one changes the site instead of changing one place out of two. For transparency use \`rgba(var(--token-rgb), 0.68)\``,
    });
  };

  for (const { value, index } of declarations(clean)) {
    const bare = withoutIndirection(value);

    const hex = /#[0-9a-fA-F]{3,8}\b/g;
    let match: RegExpExecArray | null;
    while ((match = hex.exec(bare)) !== null) report(match[0], index);

    const channels = /\b(rgba?|hsla?)\s*\(\s*[\d.]/gi;
    while ((match = channels.exec(bare)) !== null) report(`${match[1]}(`, index);

    const words = /\b[a-z]+\b/gi;
    while ((match = words.exec(bare)) !== null) {
      const word = match[0].toLowerCase();
      if (COLOUR_WORDS.has(word)) report(word, index);
    }
  }

  return violations;
}

/* --- Rule 23: type sizes are written in rem ----------------------------- */

/**
 * A text size written in px — on its own or as a limit of a `clamp()`.
 *
 * A `font-size` in px does not answer the reader who enlarges the text from the
 * browser or from the system: the page stays exactly where it was. It is the
 * one accessibility failure that costs nothing to a reader who never asks for
 * it and everything to a reader who does — and this site is read by people in
 * their fifties and sixties, which is why the rule exists rather than the
 * general principle.
 *
 * `clamp()` is where it hides. `clamp(28px, 4.6vw, 72px)` looks fluid, and it
 * is — against the width of the window, which is a different question: not one
 * of its three terms grows when the base size does, so the scaling a reader
 * asked for lands on nothing. That is the exact shape PR 18 took out of the
 * scenes, copied over from the design, and this is what keeps it out.
 *
 * Only `font-size` and the `font` shorthand are read. Every other length in px
 * is legitimate and several are deliberate: a padding that stays put while the
 * text grows is giving the text the room, and `--timeline-tick-height: 36px` is
 * a target for a finger, which is the same size on every screen at every text
 * setting.
 */
export function checkPixelFontSizes(
  css: string,
  path = 'the stylesheet',
): Violation[] {
  const violations: Violation[] = [];
  const clean = stripComments(css);

  for (const { property, value, index } of declarations(clean)) {
    const name = property.toLowerCase();
    if (name !== 'font-size' && name !== 'font') continue;

    const found = value.match(/\b\d*\.?\d+px\b/g);
    if (!found) continue;

    violations.push({
      rule: 'rule 23',
      detail: `\`${name}: ${value.trim()}\` on line ${lineNumber(clean, index)} of ${path} sizes text in px (${found.join(', ')}): a reader who enlarges the system text gets nothing, and inside a \`clamp()\` that is invisible — the value still scales with the window. Write the limits in \`rem\`, or with one of the \`--text-*\` tokens`,
    });
  }

  return violations;
}

/* --- Rule 4, at the source: no double declarations ---------------------- */

/**
 * Catches the shape the minifier collapses in the source, instead of
 * observing its absence in dist/. A fallback belongs in `@supports`: two
 * declarations of the same property in one block are not a fallback, they are
 * one declaration that disappears.
 */
export function checkDuplicateDeclarations(css: string): Violation[] {
  const violations: Violation[] = [];
  const clean = stripComments(css);

  for (const { body, index } of innermostBlocks(clean)) {
    const seen = new Map<string, number>();
    for (const { property } of declarations(body)) {
      const name = property.toLowerCase();
      seen.set(name, (seen.get(name) ?? 0) + 1);
    }

    for (const [property, count] of seen) {
      if (count > 1) {
        violations.push({
          rule: 'rule 4',
          detail: `\`${property}\` is declared ${count} times in the block on line ${lineNumber(clean, index)}: the minifier keeps only the last one. Fallbacks go in @supports`,
        });
      }
    }
  }

  return violations;
}
