/* The text this site does not have yet, in one file, written so that nobody can
 * mistake it for the text it stands in for.
 *
 * The design comes with prose: a founding story, four people with names and
 * roles, four statistics. None of it is the association's — it is what a
 * designer writes so that a layout has something in it — and the address in it
 * is wrong three different ways. Published as it stands, that is the exact
 * defect this repository spends its time hunting: a page that renders
 * perfectly, says something false, and fails nowhere. Nobody rereads a page
 * that looks finished.
 *
 * So the placeholders are **obvious**: lorem ipsum, `Nome Cognome`, figures of
 * `0000` and `9999`. Latin in a site whose rule says visible text is Italian,
 * and deliberately — this is not text for a reader, it is the absence of text,
 * and it has to look like one at a glance.
 *
 * Three things keep it from quietly becoming permanent:
 *
 * 1. it is all here, so replacing it is one file and not a hunt;
 * 2. every block that carries some of it is marked `data-placeholder` in the
 *    markup and labelled on screen, and a guard reads that back out of dist/ —
 *    a placeholder that loses its mark is a placeholder that starts passing for
 *    content;
 * 3. with `site` set in astro.config.mjs — that is, the day the site has an
 *    address of its own — a `data-placeholder` in dist/ is a violation. PR 20
 *    cannot publish this. That is the point of it, and it is written down in
 *    docs/questioni-aperte.md so that it is not a surprise then.
 *
 * Pure, like the other modules of src/lib.
 */

/** What the reader is told, beside anything that stands in for the real thing.
 *
 *  «Segnaposto» and not «Testo di prova»: the same chip marks the frames where
 *  a photograph goes, and a picture is not a text. */
export const PLACEHOLDER_NOTE = 'Segnaposto';

/** The same thing, said in full where there is room for a sentence. */
export const PLACEHOLDER_HINT =
  "Questo blocco è un segnaposto: i testi definitivi arrivano dall'associazione.";

/** The frames where the design has a photograph and this site has none.
 *
 *  Said as an instruction rather than as a caption — «da inserire» — because
 *  that is what an empty frame is: a thing somebody has to do, not a design
 *  decision to leave a box empty. */
export const PLACEHOLDER_IMAGES = {
  hall: 'Fotografia della sala da inserire',
  entrance: "Fotografia dell'ingresso, o una mappa, da inserire",
  portrait: 'Ritratto da inserire',
} as const;

/**
 * The photographs this site publishes and this association did not take.
 *
 * Two, in `src/assets/photos/`, and they are the one kind of placeholder the
 * marking cannot reach: `checkNoPlaceholders` reads `data-placeholder` out of
 * the markup, and a photograph is not a block of text with a frame around it —
 * it is the picture of an evening, in the shape the site clips it to, looking
 * exactly like the real thing will look. Nothing anywhere says it is a stand-in
 * except a comment in the content file, which is not published and not read.
 *
 * So they are declared here, beside the sentences, and the guards do the two
 * things the marking would have done. Filenames and not stems, because what a
 * person can check is what is on the disk — the stem is what a build makes of
 * it, and deriving it is the guard's business.
 *
 * There is deliberately **no** guard demanding that every photograph in that
 * folder be declared. The day the association sends its own, a guard like that
 * would report them — a guard firing on correct work is the kind somebody
 * switches off, and it would take the two real ones with it. Declaring is a
 * human act here, as it is for `PLACEHOLDER_NUMBER`.
 */
export const PLACEHOLDER_PHOTOS = [
  /* Una per serata, fotografie stock scaricate da picsum.photos — l'archivio di
     Unsplash — e ridotte a 1600px. Hanno sostituito due locandine generate che
     avevano del testo stampato sopra: dentro la capsula inclinata quel testo
     finiva accanto al titolo della serata, e due scritte diverse a mezzo
     centimetro l'una dall'altra si leggono come una sola.
     Restano segnaposto, e non perché siano brutte: non sono di questa
     associazione e non ritraggono queste serate. */
  'serata-78.webp',
  'serata-80.webp',
  'serata-81.webp',
  'serata-82.webp',
  'serata-83.webp',
  /* I quattro ritratti sono tinte unite 800×800, chieste così: servono a far
     vedere il ritaglio a otto lobi su una faccia che non c'è ancora, e sono
     segnaposto per la stessa ragione delle fotografie — una tinta piena in un
     ritratto rende perfettamente e non dice di sé che non è una persona. */
  'ritratto-amina-belhaj.png',
  'ritratto-chiara-fenoglio.png',
  'ritratto-marco-zatterin.png',
  'ritratto-piergiorgio-rosso.png',
] as const;

export type PlaceholderPerson = { name: string; role: string };
export type PlaceholderValue = { title: string; body: string };
export type PlaceholderFigure = { value: string; label: string };

/* One long paragraph and one short, so that a layout tuned on them is tuned on
   two lengths — a page whose every paragraph is the same size looks right for a
   reason that will not survive the real text. */
const LOREM_LONG =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.';

const LOREM_SHORT =
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.';

/**
 * Everything the two institutional pages say and the association has not
 * written yet, keyed by where it goes.
 *
 * The section labels are *not* here — «Chi siamo», «Come nasce», «I nostri
 * valori», «Dove siamo» are the structure of the page and not its claims, and
 * they are the same words whatever the association ends up writing underneath.
 * What is here is every sentence that asserts something.
 */
export const PLACEHOLDER_TEXTS = {
  manifestoTitle: 'Lorem ipsum dolor sit amet consectetur',
  manifestoLead: LOREM_LONG,

  originTitle: 'Sed do eiusmod tempor incididunt',
  originParagraphs: [LOREM_LONG, LOREM_SHORT],

  values: [
    { title: 'Lorem ipsum', body: LOREM_SHORT },
    { title: 'Dolor sit amet', body: LOREM_SHORT },
    { title: 'Consectetur elit', body: LOREM_SHORT },
  ] satisfies PlaceholderValue[],

  peopleLead: LOREM_SHORT,
  /* Four, as the design has four, and not one of them a name: what is being
     held here is the shape of the section — a portrait, a name, a role — and
     four rows of `Nome Cognome` say that without inventing a directive. */
  people: [
    { name: 'Nome Cognome', role: 'Ruolo da definire' },
    { name: 'Nome Cognome', role: 'Ruolo da definire' },
    { name: 'Nome Cognome', role: 'Ruolo da definire' },
    { name: 'Nome Cognome', role: 'Ruolo da definire' },
  ] satisfies PlaceholderPerson[],

  /* The hours are a claim like any other: the evenings in the collection start
     at nine, but «apertura alle 20.30» is the design's, and how early the door
     opens is not something a build can work out. */
  venueHours: 'Lorem ipsum: apertura alle 00.00, si comincia alle 00.00',
  venueAccess: 'Dolor sit amet, consectetur adipiscing elit',

  figuresLead: LOREM_SHORT,
  /* Not counted from the collection, though two of the four could be: with the
     archive still to be migrated the site would publish «5 serate» about an
     association at its eighty-first, which is a wrong number arrived at
     honestly. The real ones come from the association, and until then these
     are four figures nobody can read as data. */
  figures: [
    { value: '0000', label: 'Serate' },
    { value: '9999', label: 'Persone in sala' },
    { value: '0000', label: 'Soci e socie' },
    { value: '9999', label: 'Costo del biglietto' },
  ] satisfies PlaceholderFigure[],

  contactTitle: 'Lorem ipsum dolor sit amet',
  contactLead: LOREM_LONG,
  /* The mailbox does not exist yet: it arrives with the domain, and until then
     the address in the design is a `mailto:` that reaches nobody — the same
     defect as the placeholder telephone number, wearing an at sign. */
  emailNote:
    'La casella arriva insieme al dominio: fino ad allora la via che funziona è WhatsApp.',
} as const;

/**
 * Every placeholder sentence, flat — what a guard hunts for in dist/.
 *
 * The figures are not in here, and that is a decision about false positives
 * rather than about coverage: `0000` is four characters that occur in a hashed
 * filename and in the coordinates of an SVG path, and a guard that reported
 * those would be reporting correct work — which is how a guard gets switched
 * off. They are covered the other way round, by the assertion that the block
 * they sit in carries the mark.
 */
export function placeholderTexts(): string[] {
  const texts = PLACEHOLDER_TEXTS;

  return [
    texts.manifestoTitle,
    texts.manifestoLead,
    texts.originTitle,
    ...texts.originParagraphs,
    ...texts.values.flatMap((value) => [value.title, value.body]),
    texts.peopleLead,
    ...texts.people.flatMap((person) => [person.name, person.role]),
    texts.venueHours,
    texts.venueAccess,
    texts.figuresLead,
    texts.contactTitle,
    texts.contactLead,
    texts.emailNote,
    PLACEHOLDER_HINT,
    ...Object.values(PLACEHOLDER_IMAGES),
  ];
}
