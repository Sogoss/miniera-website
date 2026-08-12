/* Guards over what every published page has to be, whatever it contains.
 *
 * These are the invariants the base layout exists to guarantee. They are worth
 * guarding precisely because the layout guarantees them: the day a page is
 * written without it — a route added in a hurry, a component that renders a
 * whole document — nothing complains, and what is lost is the language a screen
 * reader announces, the way a preview reads in a chat, or the only way a
 * keyboard has to get past the navigation.
 */
import { stripMarkupComments } from './language.ts';
import { type Violation, lineNumber } from './types.ts';

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
  const clean = stripMarkupComments(markup);

  const lang = /<html\b[^>]*\blang\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(clean);
  const declared = (lang?.[1] ?? lang?.[2] ?? lang?.[3] ?? '').trim().toLowerCase();
  if (declared !== 'it') {
    violations.push({
      rule: 'document',
      detail: declared
        ? `${path}: \`<html lang="${declared}">\`, but this site is written in Italian: a screen reader pronounces the page in the language the document declares`
        : `${path}: \`<html>\` declares no language, so a screen reader falls back to the one the user's system is in — and reads Italian as if it were that`,
    });
  }

  if (!/<meta\b[^>]*\bcharset\s*=\s*["']?utf-8/i.test(clean)) {
    violations.push({
      rule: 'document',
      detail: `${path}: no \`<meta charset="utf-8">\`. Every accented letter of this site — perché, giovedì — depends on it being the first thing the parser reads`,
    });
  }

  if (!/<meta\b[^>]*\bname\s*=\s*["']?viewport/i.test(clean)) {
    violations.push({
      rule: 'document',
      detail: `${path}: no viewport meta, so a phone renders the page at desktop width and scales it down`,
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
  { name: 'og:type', pattern: /<meta\b[^>]*\bproperty\s*=\s*["']og:type["'][^>]*\bcontent\s*=\s*["'][^"']+/i },
  { name: 'og:site_name', pattern: /<meta\b[^>]*\bproperty\s*=\s*["']og:site_name["'][^>]*\bcontent\s*=\s*["'][^"']+/i },
  { name: 'og:locale', pattern: /<meta\b[^>]*\bproperty\s*=\s*["']og:locale["'][^>]*\bcontent\s*=\s*["'][^"']+/i },
  { name: 'og:title', pattern: /<meta\b[^>]*\bproperty\s*=\s*["']og:title["'][^>]*\bcontent\s*=\s*["'][^"']+/i },
  { name: 'og:description', pattern: /<meta\b[^>]*\bproperty\s*=\s*["']og:description["'][^>]*\bcontent\s*=\s*["'][^"']+/i },
  { name: 'twitter:card', pattern: /<meta\b[^>]*\bname\s*=\s*["']twitter:card["'][^>]*\bcontent\s*=\s*["'][^"']+/i },
  { name: 'description', pattern: /<meta\b[^>]*\bname\s*=\s*["']description["'][^>]*\bcontent\s*=\s*["'][^"']+/i },
];

/** The two that need one, and cannot be written until there is a domain. */
const ABSOLUTE = [
  { name: 'og:url', pattern: /<meta\b[^>]*\bproperty\s*=\s*["']og:url["'][^>]*\bcontent\s*=\s*["'](https?:\/\/[^"']+)/i },
  { name: 'og:image', pattern: /<meta\b[^>]*\bproperty\s*=\s*["']og:image["'][^>]*\bcontent\s*=\s*["'](https?:\/\/[^"']+)/i },
];

/**
 * The Open Graph tags a page publishes.
 *
 * `withDomain` is not a preference: `og:url` and `og:image` have to be absolute
 * URLs, and until `site` is set in astro.config.mjs there is no domain to build
 * one from — a relative value there produces a preview with no picture, in the
 * markup it looks perfectly fine. So they are required exactly when the site
 * knows its own address, which is what makes this guard turn red *by itself*
 * the day PR 13 sets it.
 */
export function checkOpenGraph(
  markup: string,
  path = 'the page',
  { withDomain = false }: { withDomain?: boolean } = {},
): Violation[] {
  const violations: Violation[] = [];
  const clean = stripMarkupComments(markup);

  if (!/<title\b[^>]*>[^<]+<\/title>/i.test(clean)) {
    violations.push({ rule: 'document', detail: `${path}: no \`<title>\`, or an empty one` });
  }

  for (const { name, pattern } of ALWAYS) {
    if (pattern.test(clean)) continue;
    violations.push({
      rule: 'document',
      detail: `${path}: no \`${name}\` with a value. It is what a link to this page looks like in a chat, which for this site is how most people meet it`,
    });
  }

  if (!withDomain) return violations;

  for (const { name, pattern } of ABSOLUTE) {
    if (pattern.test(clean)) continue;
    violations.push({
      rule: 'document',
      detail: `${path}: \`site\` is set in astro.config.mjs but there is no absolute \`${name}\`. The domain is what those two were waiting for — see PR 13`,
    });
  }

  return violations;
}

/* --- The way past the navigation ------------------------------------------ */

/**
 * The skip link: first thing a keyboard reaches, and it has to land somewhere.
 *
 * The full-screen scroll-snap makes this more than a formality — it is the
 * structural mitigation agreed for it, together with the per-evening pages.
 * Being *first* is the whole point: a skip link reached after the navigation
 * has skipped nothing.
 */
export function checkSkipLink(markup: string, path = 'the page'): Violation[] {
  const clean = stripMarkupComments(markup);
  const body = clean.slice(clean.search(/<body\b/i));

  const first = /<a\b[^>]*>/i.exec(body);
  if (!first) {
    return [
      {
        rule: 'document',
        detail: `${path}: no link at all in the body, so there is no skip link either: a keyboard has to walk the whole navigation to reach the programme`,
      },
    ];
  }

  const href = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(first[0]);
  const target = (href?.[1] ?? href?.[2] ?? href?.[3] ?? '').trim();

  if (!target.startsWith('#')) {
    return [
      {
        rule: 'document',
        detail: `${path}: the first link of the page points at \`${target || 'nothing'}\` instead of an anchor in the page. The skip link has to come first, or it skips nothing`,
      },
    ];
  }

  const id = target.slice(1);
  /* The whole id, not a prefix of one: `\b` after the name would accept
     `id="programma-2"` for `#programma`, and the link would land nowhere while
     the guard said it was fine. Escaped, because an id is whatever the page
     wrote and this becomes a pattern. */
  const exact = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const anchored = new RegExp(
    `\\bid\\s*=\\s*(?:"${exact}"|'${exact}'|${exact}(?=[\\s>]))`,
    'i',
  ).test(clean);
  if (!anchored) {
    return [
      {
        rule: 'document',
        detail: `${path}: the skip link points at \`${target}\`, which is not an id in this page: it moves the focus nowhere and a keyboard is left where it was`,
      },
    ];
  }

  return [];
}
