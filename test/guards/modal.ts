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
 * nothing at all.
 */
export function checkModalTargets(markup: string, path = 'the page'): Violation[] {
  const clean = stripMarkupComments(markup);
  const violations: Violation[] = [];
  const reported = new Set<string>();

  const ids = new Set(
    [...clean.matchAll(/\sid\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].map((match) =>
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
