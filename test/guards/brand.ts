/* Guards over rule 7: the brand is always used in full.
 *
 * «Il marchio va sempre nella forma estesa, con la scritta "in Periferia". La
 * variante breve non si usa mai, navigazione mobile inclusa: se lo spazio è
 * poco si riduce l'altezza, non si taglia la firma.»
 *
 * It is a rule about what a reader sees, so the guard that matters reads the
 * published page and not the component: a mark can lose its signature through a
 * prop, through a caller writing the words by hand, or through a page that
 * builds its own header — and only the published markup sees all three.
 *
 * The second guard is a tripwire on the source, for the shape the defect took
 * in the export: a prop that offers the short variant. It is not a semantic
 * analysis and does not pretend to be; what keeps it honest is that it has been
 * seen firing on exactly that prop.
 */
import { stripMarkupComments } from './language.ts';
import { type Violation, lineNumber } from './types.ts';

/** The signature that has to travel with the mark, however it is cased. */
const SIGNATURE = 'in periferia';

/* Elements that cannot have children, so cannot hold a signature. */
const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'param', 'source', 'track', 'wbr',
]);

/**
 * Every element carrying `data-brand`, with the text inside it.
 *
 * Scanned with the brackets balanced rather than up to the first `</span>`: the
 * mark is three nested spans, so stopping at the first closing tag would read
 * the accent bar alone and find no text in any mark ever published — a guard
 * that fires on correct markup, which is the half that gets switched off.
 */
export function brandElements(markup: string): { text: string; index: number }[] {
  const found: { text: string; index: number }[] = [];
  const opening = /<([a-z][a-z0-9-]*)\b([^>]*)>/gi;
  let match: RegExpExecArray | null;

  while ((match = opening.exec(markup)) !== null) {
    const [whole, tag = '', attributes = ''] = match;
    if (!/\sdata-brand(?=[\s=>/]|$)/i.test(attributes)) continue;

    /* An element that has no closing tag holds no text, and saying so is the
       whole of it: counting `</tag>` from a void or self-closed element never
       gets back to zero, so the scan used to run to the end of the document and
       call the rest of the page the mark's text. On the gallery that rest
       contains the signature band, so a mark on `<img data-brand>` — a raster
       logo — passed the check by borrowing somebody else's words. */
    if (VOID_ELEMENTS.has(tag.toLowerCase()) || /\/\s*$/.test(attributes)) {
      found.push({ text: '', index: match.index });
      continue;
    }

    const from = match.index + whole.length;
    let depth = 1;
    let end = markup.length;

    const nested = new RegExp(`</?${tag}\\b`, 'gi');
    nested.lastIndex = from;
    let step: RegExpExecArray | null;
    while ((step = nested.exec(markup)) !== null) {
      depth += step[0].startsWith('</') ? -1 : 1;
      if (depth === 0) {
        end = step.index;
        break;
      }
    }

    found.push({
      // Tags out, whitespace collapsed: what is left is what a reader gets.
      // Attributes go with the tags, which is deliberate — a signature living
      // in an `aria-label` over a truncated mark is the defect, not the fix.
      text: markup.slice(from, end).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
      index: match.index,
    });
  }

  return found;
}

/**
 * A mark published without its signature.
 *
 * Nothing fails when it happens: the page renders, the brand simply reads
 * «Miniera Culturale», and the association loses the half of its name that says
 * where it is.
 */
export function checkBrandSignature(markup: string, path = 'the page'): Violation[] {
  const clean = stripMarkupComments(markup);
  const violations: Violation[] = [];

  for (const { text, index } of brandElements(clean)) {
    if (text.toLowerCase().includes(SIGNATURE)) continue;
    violations.push({
      rule: 'rule 7',
      detail: `${path}: the brand on line ${lineNumber(clean, index)} reads «${text}», without «in Periferia». The mark is always used in full — if there is no room the height comes down, the signature does not come off`,
    });
  }

  return violations;
}

/* The names a short variant comes back under, and the values it takes. Kept
   short on purpose: this is a tripwire on the one shape the defect had in the
   export, not a vocabulary of everything a prop could be called. */
const SHORT_PROPS = ['shape', 'form', 'forma', 'variant', 'variante', 'short', 'breve', 'compact'];
const SHORT_VALUES = ['breve', 'short', 'compact', 'mark-only'];

/**
 * The way back in: a prop on `Brand` that offers the short variant again.
 *
 * The export had `forma="esteso" | "breve"`, and rule 7 exists because somebody
 * reached for the short one in the mobile navigation. The component does not
 * offer it, and this is what says so the day a prop is added «just for the
 * footer» — before it reaches a page, where the guard above would catch it only
 * once something was published without the signature.
 */
export function checkNoShortBrandVariant(source: string, path = 'Brand.astro'): Violation[] {
  const clean = stripMarkupComments(source);
  const violations: Violation[] = [];

  /* A property is recognised after a brace, a semicolon, a comma or a line
     break — not at the start of a line alone, which was the first shape this
     was written in and which missed `type Props = { shape?: 'short' }` written
     out on one line. A name with a hyphen in it is not a prop: that is how
     `shape-outside` and `font-variant` stay out of a guard about props. */
  const props = /(?:^|[{;,])\s*(?:\/\*\*[\s\S]*?\*\/\s*)?([a-z][a-z0-9]*)\??\s*:/gim;
  let match: RegExpExecArray | null;
  while ((match = props.exec(clean)) !== null) {
    const name = (match[1] ?? '').toLowerCase();
    if (!SHORT_PROPS.includes(name)) continue;
    violations.push({
      rule: 'rule 7',
      detail: `${path}: \`${match[1]}\` on line ${lineNumber(clean, match.index)} is a prop for choosing the shape of the mark. The brand has one shape — offering a second one is how the short variant comes back, and the export shows where it ends up: the mobile navigation`,
    });
  }

  for (const value of SHORT_VALUES) {
    const pattern = new RegExp(`['"\`]${value}['"\`]`, 'gi');
    while ((match = pattern.exec(clean)) !== null) {
      violations.push({
        rule: 'rule 7',
        detail: `${path}: the value \`${match[0]}\` on line ${lineNumber(clean, match.index)} names a short form of the mark, which does not exist`,
      });
    }
  }

  return violations;
}
