/* Guards over the modal.
 *
 * One modal per page, filled by cloning whatever the button points at. Which
 * makes the failure the same shape as a clip path that resolves to nothing: the
 * button is there, it is pressed, and nothing happens — no error in the console
 * worth the name, no failed build, and on a phone no way of telling whether the
 * tap was registered.
 *
 * The other half is what the page looks like with the script off. The links to
 * an evening's recordings are content, so they are real `<a href>` in the
 * markup and the modal clones them; a page that kept them in a `<template>`
 * instead would publish a button that does nothing and content nobody can
 * reach.
 */
import { stripMarkupComments } from './language.ts';
import { type Violation, lineNumber } from './types.ts';

/** Every `data-modal-from` on a page, with where it is. */
export function modalOpeners(markup: string): { target: string; index: number }[] {
  const found: { target: string; index: number }[] = [];
  const pattern = /\sdata-modal-from\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(markup)) !== null) {
    found.push({ target: (match[1] ?? match[2] ?? '').trim(), index: match.index });
  }
  return found;
}

/**
 * A button that opens nothing.
 *
 * `document.getElementById` returning null is where this ends up, and the
 * script leaves the page exactly as it was: the failure is a tap that does
 * nothing at all. Which is also why an id written *inside* a `<template>` does
 * not count as an answer: it is in the markup and not in the document, so it
 * reads as a target that is there and behaves as one that is not.
 */
export function checkModalTargets(markup: string, path = 'the page'): Violation[] {
  const clean = stripMarkupComments(markup);
  const violations: Violation[] = [];
  const reported = new Set<string>();

  /* Ids counted where `document.getElementById` would find them, which is not
     everywhere the attribute can be written: the contents of a `<template>` are
     an inert document of their own, so an id in there resolves to nothing. The
     id *on* the template survives — that is the booking text, and it is how the
     modal is filled — so only the inside is blanked, spaces for characters and
     newlines kept, which leaves the line numbers of everything after it right. */
  const reachable = clean.replace(
    /(<template\b[^>]*>)([\s\S]*?)(<\/template>)/gi,
    (_whole, open: string, inside: string, close: string) =>
      open + inside.replace(/[^\n]/g, ' ') + close,
  );

  const ids = new Set(
    [...reachable.matchAll(/\sid\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].map((match) =>
      (match[1] ?? match[2] ?? '').trim(),
    ),
  );

  for (const { target, index } of modalOpeners(clean)) {
    if (ids.has(target) || reported.has(target)) continue;
    reported.add(target);
    violations.push({
      rule: 'modal',
      detail: `${path}: a button opens \`${target}\` on line ${lineNumber(clean, index)}, and nothing on the page has that id. The script finds nothing to clone and leaves the page as it was — the button is simply dead, which on a phone is indistinguishable from a tap that did not register`,
    });
  }

  return violations;
}

/* The two classes that decide which form of a control a reader gets, and the
   `display` each of them has to switch off. */
const SWITCHES = [
  {
    selector: '.no-js .only-js',
    what: 'the button that opens the modal, for a reader with no scripting',
  },
  {
    selector: 'html:not(.no-js) .no-js-only',
    what: 'the plain links and the direct WhatsApp link, once the script is running',
  },
];

/**
 * The `no-js` switch actually wins.
 *
 * A page carries both forms of a control — the button that opens the modal and
 * the plain thing that needs no script — and one rule decides which of the two
 * a reader sees. Which makes it not styling but «for this reader that element
 * does not exist», and it has to beat whatever a component declares about its
 * own display.
 *
 * It did not. `.no-js .only-js` is two classes, and so is the
 * `.button[data-astro-cid-…]` a scoped component style compiles to: a tie, and
 * a tie goes to whichever stylesheet the bundler put last, which was the
 * component. Half the switch worked — `html:not(.no-js) .no-js-only` carries an
 * element as well, so it wins by a point — and half did not, which is the worst
 * possible arrangement: with scripting off, a dead button published on top of
 * the very links it was standing in for. It was shipped at PR 7 and found at
 * PR 12 by opening the built site with the class put back by hand, because in
 * the source the two halves look symmetrical.
 *
 * Read out of dist/ rather than out of global.css, and the reason is the whole
 * defect: what was wrong was never in that file, it was where the file landed.
 */
export function checkNoJsSwitch(css: string, path = 'the published CSS'): Violation[] {
  const violations: Violation[] = [];

  for (const { selector, what } of SWITCHES) {
    /* Every rule that names this selector, whether it stands alone or in a
       list: the minifier merges the two halves into one rule with a comma, and
       a check that only knew the standalone form would report a stylesheet
       that is perfectly correct. */
    /* Every metacharacter escaped, and not the five that happen to be in the
       two selectors above: the day one of them names an attribute —
       `[data-timeline] .no-js-only` — a half-escaped `[` opens a character
       class, and what the guard then looks for is not a selector at all. */
    const at = new RegExp(
      `(^|[,{}])\\s*${selector.replace(/[.*+?^${}()|[\]\\/:-]/g, '\\$&')}\\s*[,{]`,
      'gi',
    );

    let found = false;
    let match: RegExpExecArray | null;
    while ((match = at.exec(css)) !== null) {
      const open = css.indexOf('{', match.index + match[0].length - 1);
      /* A block that never closes declares nothing. Written
         `css.slice(open, css.indexOf('}', open))` a missing `}` gave -1, and a
         negative end means «one character short of the end of the stylesheet»
         rather than «nothing» — so what this read was the whole rest of the
         file with its last character bitten off, which is the shape of answer
         that is right by accident. */
      const close = open === -1 ? -1 : css.indexOf('}', open);
      const body = open === -1 || close === -1 ? '' : css.slice(open, close);
      if (!/display\s*:\s*none/i.test(body)) continue;

      found = true;
      if (/display\s*:\s*none\s*!\s*important/i.test(body)) continue;
      violations.push({
        rule: 'modal',
        detail: `${path}: \`${selector}\` hides ${what} without \`!important\`. Two classes is what a scoped component style also weighs — \`.button[data-astro-cid-…]\` — so the two declarations tie and the order of the stylesheets decides. It has already been decided the wrong way once: a dead button published on top of the links it stands in for`,
      });
    }

    if (!found) {
      violations.push({
        rule: 'modal',
        detail: `${path}: nothing hides ${what}. Without \`${selector}\` a page publishes both forms of every control at once — the button and the fallback, one of which does nothing`,
      });
    }
  }

  return violations;
}

/**
 * More than one modal in a document.
 *
 * The decision is one per page, reused: with 81 evenings, a modal each would be
 * 81 copies of the same chrome. And the script talks to the first one it finds,
 * so a second would sit there collecting nothing.
 */
export function checkSingleModal(markup: string, path = 'the page'): Violation[] {
  const clean = stripMarkupComments(markup);
  const dialogs = [...clean.matchAll(/<dialog\b/gi)];
  if (dialogs.length <= 1) return [];

  return dialogs.slice(1).map((dialog) => ({
    rule: 'modal',
    detail: `${path}: a second \`<dialog>\` on line ${lineNumber(clean, dialog.index)}. The page has one modal and every button fills it — the script opens the first it finds, so this one is never shown and never says so`,
  }));
}

/**
 * Content that only exists inside a `<template>`.
 *
 * A template is markup the browser parses and does not render: fine for the
 * booking text, which is written for the modal and has no place in the page
 * until asked for. Not fine for an evening's recordings, which are content —
 * inside a template they are invisible to a reader with no scripting, to a
 * crawler, and to Ctrl+F.
 *
 * `expected` is what has to be a real link somewhere outside the templates.
 */
export function checkLinksOutsideTemplates(
  markup: string,
  expected: readonly string[],
  path = 'the page',
): Violation[] {
  const clean = stripMarkupComments(markup).replace(
    /<template\b[\s\S]*?<\/template>/gi,
    (template) => template.replace(/[^\n]/g, ' '),
  );

  return expected
    .filter((url) => !clean.includes(url))
    .map((url) => ({
      rule: 'modal',
      detail: `${path}: \`${url}\` reaches the page only inside a <template>. The modal clones what is already in the markup, so the links of an evening stay links: in a template they are invisible with scripting off, to a crawler, and to Ctrl+F`,
    }));
}
