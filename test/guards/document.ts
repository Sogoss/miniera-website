/* Guards over what every published page has to be, whatever it contains.
 *
 * These are the invariants the base layout exists to guarantee. They are worth
 * guarding precisely because the layout guarantees them: the day a page is
 * written without it — a route added in a hurry, a component that renders a
 * whole document — nothing complains, and what is lost is the language a screen
 * reader announces, the way a preview reads in a chat, or the only way a
 * keyboard has to get past the navigation.
 *
 * Everything here reads markup with regular expressions, which is a choice with
 * two failure modes and both of them matter: answering «fine» to the very
 * defect the message describes, and answering «broken» to correct markup — the
 * second one is worse, because a guard that fires on good work is a guard
 * somebody switches off. The helpers below exist for that: attributes are read
 * by name rather than by position, `data-id` is not `id`, and script bodies are
 * not markup.
 */
import { stripComments } from './css.ts';
import { stripMarkupComments } from './language.ts';
import { type Violation, lineNumber } from './types.ts';

/* --- Reading markup without being fooled by it --------------------------- */

/**
 * The value of an attribute, whatever order the attributes are in.
 *
 * The lookbehind is the whole point: `data-id` is not `id` and `xml:lang` is
 * not `lang`. Both were accepted before, so a page could satisfy the guard
 * while carrying neither of the things it asks for.
 */
export function attributeOf(tag: string, name: string): string | undefined {
  const pattern = new RegExp(
    `(?<![-:\\w])${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    'i',
  );
  const match = pattern.exec(tag);
  if (!match) return undefined;
  return match[1] ?? match[2] ?? match[3] ?? '';
}

/* Elements that cannot have children, so cannot contain anything. */
const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'param', 'source', 'track', 'wbr',
]);

/** An element carrying some attribute, and where its content begins and ends. */
export type ElementRange = { tag: string; index: number; from: number; to: number };

/**
 * Every element carrying a given attribute, with the span of what is inside it.
 *
 * Scanned with the tags balanced rather than up to the first closing one: a
 * mark is three nested spans and a marked section is a page's worth of them, so
 * stopping at the first `</span>` would call the first child «the content» —
 * a guard that answers about the wrong text is a guard that fires on correct
 * work, and this one has already been written that way once.
 *
 * An element with no closing tag contains nothing, and saying so is the whole
 * of it: counting `</tag>` from a void or self-closed element never gets back
 * to zero, so the scan ran to the end of the document and called the rest of
 * the page its content. `<img data-brand>` — a raster logo — passed the
 * signature check that way, by borrowing the words of a band further down.
 */
export function elementsWith(markup: string, attribute: string): ElementRange[] {
  const found: ElementRange[] = [];
  const opening = /<([a-z][a-z0-9-]*)\b([^>]*)>/gi;
  const carries = new RegExp(`\\s${attribute}(?=[\\s=>/]|$)`, 'i');
  let match: RegExpExecArray | null;

  while ((match = opening.exec(markup)) !== null) {
    const [whole, tag = '', attributes = ''] = match;
    if (!carries.test(attributes)) continue;

    const from = match.index + whole.length;
    if (VOID_ELEMENTS.has(tag.toLowerCase()) || /\/\s*$/.test(attributes)) {
      found.push({ tag, index: match.index, from, to: from });
      continue;
    }

    let depth = 1;
    let to = markup.length;

    const nested = new RegExp(`</?${tag}\\b`, 'gi');
    nested.lastIndex = from;
    let step: RegExpExecArray | null;
    while ((step = nested.exec(markup)) !== null) {
      depth += step[0].startsWith('</') ? -1 : 1;
      if (depth === 0) {
        to = step.index;
        break;
      }
    }

    found.push({ tag, index: match.index, from, to });
  }

  return found;
}

/**
 * Comments blanked, and the contents of `<script>` and `<template>` with them.
 *
 * A script body is not markup: Astro ships it verbatim, so `const t = "<h1>"`
 * would be counted as a heading. PR 7's scroller is the obvious carrier of an
 * inline script, and a suite that turns red on it would be reporting a heading
 * problem that does not exist.
 */
function readableMarkup(markup: string): string {
  return stripMarkupComments(markup).replace(
    /<(script|template)\b[^>]*>[\s\S]*?<\/\1>/gi,
    (block) => block.replace(/[^\n]/g, ' '),
  );
}

/** Every `<meta>` of a page, by the name it goes under, with its content. */
function metaTags(markup: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const tag of markup.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = attributeOf(tag, 'property') ?? attributeOf(tag, 'name');
    const content = attributeOf(tag, 'content');
    if (key && content && content.trim()) found.set(key.trim().toLowerCase(), content.trim());
  }
  return found;
}

/* --- The document itself -------------------------------------------------- */

/**
 * The language, the charset, the viewport, and exactly one `<h1>`.
 *
 * The heading is here rather than on its own because it is the same kind of
 * fact: not a matter of style but of what the page *is*. Two `<h1>` leave a
 * screen reader with two titles for one page and Google with neither.
 */
export function checkDocumentBasics(markup: string, path = 'the page'): Violation[] {
  const violations: Violation[] = [];
  const clean = readableMarkup(markup);

  const html = /<html\b[^>]*>/i.exec(clean);
  const declared = (html ? (attributeOf(html[0], 'lang') ?? '') : '').trim().toLowerCase();
  if (declared !== 'it') {
    violations.push({
      rule: 'document',
      detail: declared
        ? `${path}: \`<html lang="${declared}">\`, but this site is written in Italian: a screen reader pronounces the page in the language the document declares`
        : `${path}: \`<html>\` declares no \`lang\` — \`xml:lang\` does not count, HTML parsers ignore it — so a screen reader falls back to the language the user's system is in, and reads Italian as if it were that`,
    });
  }

  if (!/<meta\b[^>]*\bcharset\s*=\s*["']?utf-8/i.test(clean)) {
    violations.push({
      rule: 'document',
      detail: `${path}: no \`<meta charset="utf-8">\`. Every accented letter of this site — perché, giovedì — depends on it being the first thing the parser reads`,
    });
  }

  /* The viewport is read, not merely found: `content="width=1024"` is a tag
     that matches every «is it there» check and still renders the site at
     desktop width on a phone, shrunk — word for word what the message below
     used to promise it was preventing. */
  const viewport = metaTags(clean).get('viewport');
  if (!viewport || !/\bwidth\s*=\s*device-width\b/i.test(viewport)) {
    violations.push({
      rule: 'document',
      detail: viewport
        ? `${path}: \`<meta name="viewport" content="${viewport}">\` does not say \`width=device-width\`, so a phone renders the page at desktop width and scales it down`
        : `${path}: no viewport meta with a value, so a phone renders the page at desktop width and scales it down`,
    });
  }

  const headings = [...clean.matchAll(/<h1\b/gi)];
  if (headings.length !== 1) {
    violations.push({
      rule: 'document',
      detail:
        headings.length === 0
          ? `${path}: no \`<h1>\`. Every page needs the one heading that says what it is`
          : `${path}: ${headings.length} \`<h1>\`, the first on line ${lineNumber(clean, headings[0]!.index)}. One page, one title: the rest are \`<h2>\``,
    });
  }

  return violations;
}

/* --- The preview a link produces in a chat -------------------------------- */

/** The tags that need no domain, and are therefore never optional. */
const ALWAYS = [
  'og:type',
  'og:site_name',
  'og:locale',
  'og:title',
  'og:description',
  'twitter:card',
  'description',
];

/**
 * The Open Graph tags a page publishes.
 *
 * `withDomain` is not a preference: `og:url` has to be an absolute URL, and
 * until `site` is set in astro.config.mjs there is no domain to build one from
 * — a relative value there is not resolved by WhatsApp or Facebook, and in the
 * markup it looks perfectly fine. So it is required exactly when the site knows
 * its own address, which is what makes this turn red *by itself* the day PR 16
 * sets it.
 *
 * `og:image` is deliberately **not** in that list. It needs a picture, not a
 * domain, and this repository has none: requiring it with the domain would have
 * meant PR 16 opening on a red suite it could only fix by inventing an asset
 * nobody has chosen — see docs/questioni-aperte.md. What is checked is the half
 * that is checkable: if a page does publish one, it must be absolute, because a
 * relative `og:image` is the silent version of having none.
 */
export function checkOpenGraph(
  markup: string,
  path = 'the page',
  { withDomain = false }: { withDomain?: boolean } = {},
): Violation[] {
  const violations: Violation[] = [];
  const clean = readableMarkup(markup);
  const meta = metaTags(clean);

  if (!/<title\b[^>]*>[^<]+<\/title>/i.test(clean)) {
    violations.push({ rule: 'document', detail: `${path}: no \`<title>\`, or an empty one` });
  }

  for (const name of ALWAYS) {
    if (meta.has(name)) continue;
    violations.push({
      rule: 'document',
      detail: `${path}: no \`${name}\` with a value. It is what a link to this page looks like in a chat, which for this site is how most people meet it`,
    });
  }

  const image = meta.get('og:image');
  if (image && !/^https?:\/\//i.test(image)) {
    violations.push({
      rule: 'document',
      detail: `${path}: \`og:image\` is \`${image}\`, which is relative. Open Graph resolves nothing: a preview built from this has no picture, and the markup looks correct`,
    });
  }

  if (!withDomain) return violations;

  const url = meta.get('og:url');
  if (!url || !/^https?:\/\//i.test(url)) {
    violations.push({
      rule: 'document',
      detail: `${path}: \`site\` is set in astro.config.mjs but there is no absolute \`og:url\`. The domain is what it was waiting for — see PR 16`,
    });
  }

  return violations;
}

/* --- The way past the navigation ------------------------------------------ */

const ALWAYS_FOCUSABLE = new Set(['button', 'select', 'textarea', 'summary']);

/** The first thing a Tab reaches, which is not the same as the first `<a>`. */
function firstFocusable(markup: string): { tag: string; name: string; index: number } | null {
  const pattern = /<([a-z][a-z0-9-]*)\b([^>]*)>/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(markup)) !== null) {
    const name = (match[1] ?? '').toLowerCase();
    const tag = match[0];
    const found = { tag, name, index: match.index };

    const tabindex = attributeOf(tag, 'tabindex');
    if (tabindex !== undefined && !tabindex.trim().startsWith('-')) return found;

    if (ALWAYS_FOCUSABLE.has(name)) return found;
    if (name === 'a' && attributeOf(tag, 'href') !== undefined) return found;
    if (name === 'input' && (attributeOf(tag, 'type') ?? '').toLowerCase() !== 'hidden') return found;
  }

  return null;
}

/** The tag that carries an id, whatever else it carries. */
function taggedWith(markup: string, id: string): string | undefined {
  const exact = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `<[a-z][a-z0-9-]*\\b[^>]*(?<![-:\\w])id\\s*=\\s*(?:"${exact}"|'${exact}'|${exact}(?=[\\s>]))[^>]*>`,
    'i',
  );
  return pattern.exec(markup)?.[0];
}

/**
 * The skip link: first thing a keyboard reaches, and it has to land somewhere
 * a keyboard can be put.
 *
 * The full-screen scroll-snap makes this more than a formality — it is the
 * structural mitigation agreed for it, together with the per-evening pages.
 * Three things have to hold, and each of them was found passing while broken:
 * being *first* among everything focusable and not merely among the anchors,
 * because the navigation of the design is made of `<button>`; landing on an
 * `id` and not on a `data-id`; and landing on something that can take focus,
 * which for a `<main>` means `tabindex="-1"` — without it Chrome and Safari
 * scroll the page and leave the focus on the link, so the next Tab walks back
 * into the navigation.
 */
export function checkSkipLink(markup: string, path = 'the page'): Violation[] {
  const clean = readableMarkup(markup);
  /* `<body>` is optional in HTML5, and this guard exists for pages nobody wrote
     carefully. Not finding it means reading the whole document, not the last
     character of it. */
  const at = clean.search(/<body\b/i);
  const body = at === -1 ? clean : clean.slice(at);

  const first = firstFocusable(body);
  if (!first) {
    return [
      {
        rule: 'document',
        detail: `${path}: nothing in the page can take focus, so there is no skip link either: a keyboard has to walk the whole navigation to reach the programme`,
      },
    ];
  }

  const target = (attributeOf(first.tag, 'href') ?? '').trim();
  if (first.name !== 'a' || !target.startsWith('#')) {
    /* The tag itself, not just its name: whoever reads this in CI has to be
       able to find the thing that took the first Tab, and `<button>` says far
       less than the twelve characters that follow it. */
    const opener = first.tag.length > 70 ? `${first.tag.slice(0, 67)}…>` : first.tag;
    return [
      {
        rule: 'document',
        detail: `${path}: the first thing a Tab reaches is \`${opener}\` on line ${lineNumber(body, first.index)}, not a link into the page. The skip link has to come first — before the navigation, whatever the navigation is made of — or it skips nothing`,
      },
    ];
  }

  const id = target.slice(1);
  const landing = taggedWith(clean, id);
  if (!landing) {
    return [
      {
        rule: 'document',
        detail: `${path}: the skip link points at \`${target}\`, which is not an \`id\` in this page — a \`data-id\` is not one. It moves the focus nowhere and a keyboard is left where it was`,
      },
    ];
  }

  const name = (/^<([a-z][a-z0-9-]*)/i.exec(landing)?.[1] ?? '').toLowerCase();
  const focusable =
    attributeOf(landing, 'tabindex') !== undefined ||
    ALWAYS_FOCUSABLE.has(name) ||
    (name === 'a' && attributeOf(landing, 'href') !== undefined);

  if (!focusable) {
    return [
      {
        rule: 'document',
        detail: `${path}: the skip link lands on \`<${name} id="${id}">\`, which cannot take focus. Chrome and Safari scroll there and leave the focus on the link, so the next Tab returns to the navigation: the target needs \`tabindex="-1"\``,
      },
    ];
  }

  return [];
}

/* --- Links that are not links --------------------------------------------- */

/**
 * An `<a>` with no address, and nothing said about why.
 *
 * Without `href` an anchor is not a link: it takes no focus, it maps to the
 * generic role rather than to `link`, and Enter never reaches it. On a page it
 * looks exactly like the links around it, which is the whole defect — a voice a
 * reader tries once. The navigation is where it comes from: «Rassegna stampa»
 * has no page, and the obvious way to write a voice that leads nowhere is an
 * `<a>` with the href left off. It is text instead, and this is what says so.
 *
 * There is one honest anchor without an address, and it is in this repository:
 * the disabled link of `Button`, decided at PR 6. It carries `role="link"`,
 * because an anchor with no href is not one and `aria-disabled` on a generic
 * element qualifies nothing, and `aria-disabled="true"`, because being
 * unreachable and being *announced* as switched off are different things.
 *
 * So the exception is written and then **checked**, in the way this project
 * writes exceptions: both attributes or neither. Half of it — `aria-disabled`
 * on its own — is the export's version, which announces nothing at all and is
 * exactly what PR 6 took out; the other half is a link that says it is a link
 * and does nothing.
 *
 * Templates are read like the rest of the page, unlike in the guards above: a
 * `<template>` is markup waiting to be cloned, and a dead link inside one is a
 * dead link in the modal it fills. Scripts are not — `const a = "<a>"` is a
 * string.
 */
export function checkAnchorsWithoutHref(markup: string, path = 'the page'): Violation[] {
  const clean = stripMarkupComments(markup).replace(
    /<script\b[^>]*>[\s\S]*?<\/script>/gi,
    (block) => block.replace(/[^\n]/g, ' '),
  );

  const violations: Violation[] = [];
  for (const match of clean.matchAll(/<a\b([^>]*)>/gi)) {
    const tag = match[0];
    const attributes = (match[1] ?? '').trim();
    if (attributeOf(tag, 'href') !== undefined) continue;

    /* The other legitimate one: the old-style named anchor, which is a target
       and not a link. Nothing here uses one — ids do that job — but reporting
       it would be reporting correct markup. */
    if (attributeOf(tag, 'name') !== undefined) continue;

    const role = (attributeOf(tag, 'role') ?? '').trim().toLowerCase();
    const disabled = (attributeOf(tag, 'aria-disabled') ?? '').trim().toLowerCase();
    if (role === 'link' && disabled === 'true') continue;

    const because =
      role === 'link' || disabled === 'true'
        ? 'it says half of what a switched-off link has to say: `role="link"` **and** `aria-disabled="true"`, or it announces nothing, or it announces a link that does nothing'
        : 'no focus, no announcement, no Enter. It looks like the links beside it and does nothing: either give it an address or write it as text';

    violations.push({
      rule: 'document',
      detail: `${path}: \`<a${attributes ? ` ${attributes}` : ''}>\` on line ${lineNumber(clean, match.index)} has no \`href\`, so it is not a link — ${because}`,
    });
  }

  return violations;
}

/* --- The style that makes the skip link usable ---------------------------- */

/**
 * The published CSS of the skip link.
 *
 * Markup alone cannot answer this one. A skip link that is not hidden sits on
 * top of the page for everyone; one that is hidden without a rule bringing it
 * back on focus is unreachable, which is worse than not having it — a keyboard
 * user tabs onto something invisible. Either half can be lost to a refactor or
 * to a change in how Astro scopes styles, with every markup guard still green,
 * and CLAUDE.md names this exact class of defect: for style, reading the source
 * is not enough.
 */
export function checkSkipLinkStyle(css: string, path = 'the published CSS'): Violation[] {
  const clean = stripComments(css);

  const rules = [...clean.matchAll(/\.skip-link[^{}]*\{([^}]*)\}/gi)];
  if (rules.length === 0) {
    return [
      {
        rule: 'document',
        detail: `${path}: no \`.skip-link\` rule at all. The link is in the markup, so it is now sitting on top of the page for every visitor`,
      },
    ];
  }

  const hides = rules.some(
    (rule) => !/:focus/i.test(rule[0]) && /transform\s*:\s*translate/i.test(rule[1] ?? ''),
  );
  const reveals = rules.some(
    (rule) => /:focus/i.test(rule[0]) && /transform\s*:\s*translate/i.test(rule[1] ?? ''),
  );

  const violations: Violation[] = [];
  if (!hides) {
    violations.push({
      rule: 'document',
      detail: `${path}: nothing moves \`.skip-link\` out of the way, so it is visible to everyone at all times instead of only to a keyboard`,
    });
  }
  if (!reveals) {
    violations.push({
      rule: 'document',
      detail: `${path}: no \`.skip-link:focus\` rule brings the link back into view. Tabbing onto a link nobody can see is worse than not having one`,
    });
  }

  return violations;
}
