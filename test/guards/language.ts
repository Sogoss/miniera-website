/* Guards over the language boundary of CLAUDE.md: the code is in English,
 * what gets read is in Italian.
 *
 * Only two things here, and neither of them reads prose written for a human.
 * Judging whether a comment is Italian means scanning prose, and a guard that
 * scans prose is wrong often enough in both directions to be worth less than
 * the review that would have caught the same thing. What is guarded instead is
 * where a language slip turns into a defect nobody sees:
 *
 * - a token name, because half a rename leaves a `var()` pointing at nothing;
 * - a missing accent in the content, because that one reaches the reader.
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
 * Custom properties and `data-*` attributes carrying an Italian name.
 *
 * Both the declarations and the `var()` readings are looked at: a rename that
 * moves the declaration and forgets a reading leaves the old name only on the
 * reading side, and that is the half that breaks.
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

/* --- Accents in the content --------------------------------------------- */

/**
 * Words an Italian keyboard drops the accent from, and what they should be.
 *
 * Deliberately short. `meta` is missing because it is a word in its own right
 * — and a technical one; `sara` because it is also a name; `si`, `la`, `e`
 * because their unaccented forms are the common ones. A guard that fires on a
 * correct word gets switched off, and takes the rest of the list with it.
 */
const MISSING_ACCENTS: Record<string, string> = {
  affinche: 'affinché',
  benche: 'benché',
  cioe: 'cioè',
  citta: 'città',
  cosi: 'così',
  finche: 'finché',
  gia: 'già',
  novita: 'novità',
  percio: 'perciò',
  perche: 'perché',
  pero: 'però',
  piu: 'più',
  poiche: 'poiché',
  puo: 'può',
  qualita: 'qualità',
  "e'": 'è',
};

/**
 * Runs over the content, and only the content.
 *
 * This is the one place where a missing accent is not a matter of taste: it is
 * printed on the site, under the association's name. The rest of the
 * repository — comments, documentation — is left to review, for the same
 * reason the comment guard does not exist.
 */
export function checkMissingAccents(text: string, path: string): Violation[] {
  const violations: Violation[] = [];
  const pattern = /[a-zàèéìòùâêîôû']+/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const correct = MISSING_ACCENTS[match[0].toLowerCase()];
    if (!correct) continue;

    // Skip anything that is part of a kebab-case token: identifiers and file
    // names cannot carry an accent in the first place, so `palazzo-citta-studi`
    // is not a spelling mistake. Italian prose is not written in kebab case,
    // so nothing real is lost.
    const before = text[match.index - 1];
    const after = text[match.index + match[0].length];
    if (before === '-' || after === '-') continue;
    violations.push({
      rule: 'language',
      detail: `\`${match[0]}\` in ${path}, on line ${lineNumber(text, match.index)}: in Italian text accents are written in full — \`${correct}\``,
    });
  }

  return violations;
}
