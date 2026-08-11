/* Guards over the language boundary of CLAUDE.md: the code is in English,
 * what gets read is in Italian.
 *
 * Nothing here reads prose written for a human — not comments, and, since the
 * accent guard was removed, not the content either. A guard that scans prose
 * is wrong often enough in both directions to be worth less than the reading
 * that would have caught the same thing: see decisioni.md. What is guarded is
 * only where a language slip turns into a defect nobody sees, and both are the
 * two halves of the same rename:
 *
 * - a token name, because half a rename leaves a `var()` pointing at nothing;
 * - a `data-*` attribute, because the other half leaves the selector matching
 *   nothing.
 */
import { stripComments } from './css.ts';
import { type Violation, lineNumber } from './types.ts';

/* --- Italian names among the tokens ------------------------------------- */

/**
 * The Italian half of this project's vocabulary.
 *
 * Comparison is **segment by segment** between the hyphens, never by
 * substring: a future `--shadow-blur` splits into `shadow` and `blur`, and
 * neither is `blu`. Matching on substrings would accuse it of being Italian
 * and the guard would be quietly disabled by whoever hit that.
 *
 * The list covers the words this design system actually uses — it is not, and
 * cannot be, a dictionary. It is enough to catch a name coming back after the
 * rename, which is what it is for.
 */
const ITALIAN_WORDS = new Set([
  'accento',
  'accenti',
  'altezza',
  'annullato',
  'arancio',
  'arancione',
  'barra',
  'bianco',
  'blu',
  'bordo',
  'bottone',
  'carta',
  'ciclo',
  'cicli',
  'citta',
  'colore',
  'crema',
  'descrizione',
  'etichetta',
  'evento',
  'eventi',
  'fascia',
  'formato',
  'foto',
  'indirizzo',
  'interventi',
  'larghezza',
  'marchio',
  'modale',
  'nero',
  'nome',
  'nota',
  'numero',
  'occhiello',
  'ombra',
  'ospite',
  'pagina',
  'presenze',
  'puntata',
  'relatore',
  'relatori',
  'riga',
  'ruolo',
  'scena',
  'sede',
  'sedi',
  'serata',
  'sfondo',
  'spazio',
  'stato',
  'tacca',
  'tema',
  'testo',
  'titolo',
  'velo',
]);

function italianSegment(name: string): string | null {
  for (const segment of name.split('-')) {
    if (ITALIAN_WORDS.has(segment.toLowerCase())) return segment;
  }
  return null;
}

/**
 * Custom properties and `data-*` selectors carrying an Italian name.
 *
 * Both the declarations and the `var()` readings are looked at: a rename that
 * moves the declaration and forgets a reading leaves the old name only on the
 * reading side, and that is the half that breaks.
 *
 * This one reads CSS, and only CSS: stylesheets, `<style>` blocks, inline
 * `style` attributes. The `data-*` half it can see is therefore the selector
 * — `[data-cycle="3"]`. The attribute itself lives in the markup, on the other
 * side of the rename, and has its own guard below.
 */
export function checkItalianCustomProperties(
  css: string,
  path = 'the stylesheet',
): Violation[] {
  const clean = stripComments(css);
  const violations: Violation[] = [];
  const reported = new Set<string>();

  const sources: { pattern: RegExp; what: string }[] = [
    { pattern: /(?:^|[;{])\s*--([a-z0-9-]+)\s*:/gi, what: 'the custom property' },
    { pattern: /var\(\s*--([a-z0-9-]+)/gi, what: 'the reading of' },
    { pattern: /\[\s*data-([a-z0-9-]+)\s*[\]=~|^$*]/gi, what: 'the attribute data-' },
  ];

  for (const { pattern, what } of sources) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(clean)) !== null) {
      const name = match[1]!;
      const word = italianSegment(name);
      if (!word || reported.has(`${what}${name}`)) continue;
      reported.add(`${what}${name}`);
      violations.push({
        rule: 'language',
        detail: `${what} \`${name}\` in ${path}, on line ${lineNumber(clean, match.index)}, is named in Italian (\`${word}\`): custom properties belong to the code, and the code is written in English`,
      });
    }
  }

  return violations;
}

/* Blanks out what is written for a human, newlines kept so that the reported
   line numbers stay accurate: the HTML comments, plus the block comments
   stripComments already handles — in an .astro file they arrive wrapped in
   braces, which changes nothing for the pattern. */
function stripMarkupComments(markup: string): string {
  return stripComments(markup).replace(/<!--[\s\S]*?-->/g, (comment) =>
    comment.replace(/[^\n]/g, ' '),
  );
}

/**
 * `data-*` attributes carrying an Italian name, in the markup this time.
 *
 * The other half of the rename, and the half nothing was watching: the
 * stylesheet says `[data-cycle="3"]`, the component says `data-cycle={n}`, and
 * a guard that reads CSS sees only the first. Rename one, forget the other,
 * and the rules simply stop matching — no error anywhere, `astro check` quiet,
 * every evening painted in the default accent.
 *
 * Only the attribute written with a value is looked at — `data-ciclo={n}`,
 * `data-ciclo="3"` — which is the form that carries the name to the browser.
 * That is also what keeps prose out: a comment naming the old attribute in
 * passing is not a defect, and a guard that fires on one gets switched off.
 */
export function checkItalianDataAttributes(
  markup: string,
  path = 'the markup',
): Violation[] {
  const clean = stripMarkupComments(markup);
  const violations: Violation[] = [];
  const reported = new Set<string>();

  const pattern = /\sdata-([a-z0-9-]+)\s*=/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(clean)) !== null) {
    // An attribute selector is CSS, not markup: `[ data-ciclo="2" ]` belongs
    // to the guard above, and reporting it twice would only teach whoever
    // reads the output that the two guards overlap.
    if (clean.slice(0, match.index).trimEnd().endsWith('[')) continue;

    const name = match[1]!;
    const word = italianSegment(name);
    if (!word || reported.has(name)) continue;
    reported.add(name);
    violations.push({
      rule: 'language',
      detail: `the attribute \`data-${name}\` in ${path}, on line ${lineNumber(clean, match.index)}, is named in Italian (\`${word}\`): the markup is code too, and the code is written in English`,
    });
  }

  return violations;
}
