/* Guards over the Timeline.
 *
 * The rail is eighty-one ticks that lead somewhere, and both ways it can stop
 * doing that are silent.
 *
 * A tick that points at an id nothing carries is the modal's dead button in
 * another costume: it renders, it takes the tap, and the page does not move —
 * on a phone that is indistinguishable from a tap that never registered.
 *
 * A tick written as a `<button>` is the other one, and it is worse because the
 * page looks identical. The decision is that a tick is an `<a href>`: the
 * element for a thing that leads to a place in the document, which arrives with
 * the address, the back button, open-in-new-tab, the announcement a screen
 * reader makes for a link, and a jump the browser performs with no script at
 * all. A button has none of that until somebody writes it, and the day somebody
 * writes half of it nothing here fails.
 */
import { attributeOf } from './document.ts';
import { stripMarkupComments } from './language.ts';
import { type Violation, lineNumber } from './types.ts';

/** Every element marked as a tick, with its opening tag.
 *
 *  Exported because the assertions in test/build/ ask the same question of
 *  dist/ — how many ticks are there, and what does each one carry — and three
 *  copies of this pattern is three places to rename `data-tick` and two to
 *  forget, each of which goes on passing over a list of nothing. */
export function tickTags(markup: string): { tag: string; index: number }[] {
  const pattern = /<([a-z][a-z0-9-]*)\b[^>]*?\sdata-tick\b[^>]*>/gi;
  return [...markup.matchAll(pattern)].map((match) => ({ tag: match[0], index: match.index }));
}

/**
 * A tick that is not a link.
 *
 * Reported on the tag rather than on the absence of an `href`, because both
 * halves are the same mistake: `<button data-tick>` is the export's own markup,
 * and `<a data-tick>` with no address is a link that is not one — not
 * focusable, not announced as a link, and inert with scripting off.
 */
export function checkTimelineLinks(markup: string, path = 'the page'): Violation[] {
  const clean = stripMarkupComments(markup);

  return tickTags(clean).flatMap(({ tag, index }) => {
    const name = (/^<([a-z][a-z0-9-]*)/i.exec(tag)?.[1] ?? '').toLowerCase();
    const href = attributeOf(tag, 'href');
    if (name === 'a' && href !== undefined && href.trim() !== '') return [];

    return [
      {
        rule: 'timeline',
        detail: `${path}: the tick on line ${lineNumber(clean, index)} is \`<${name}>\`${
          name === 'a' ? ' with no address' : ''
        } and not a link. A tick leads to an evening, so it is an \`<a href="#serata-N">\`: that is what carries the address, the back button, the announcement a screen reader makes, and a jump that happens with no script running. As a button it looks the same on screen and does nothing until somebody writes it`,
      },
    ];
  });
}

/**
 * A tick that leads nowhere.
 *
 * The fragment is resolved the way a browser resolves it — against the ids of
 * the same document, and not against those written inside a `<template>`, whose
 * contents are an inert document of their own.
 *
 * Only same-page fragments are examined: a tick pointing at `/81` is the evening
 * page of PR 9 and is somebody else's promise to keep.
 */
export function checkTimelineTargets(markup: string, path = 'the page'): Violation[] {
  const clean = stripMarkupComments(markup);

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

  const violations: Violation[] = [];
  const reported = new Set<string>();

  for (const { tag, index } of tickTags(clean)) {
    const href = (attributeOf(tag, 'href') ?? '').trim();
    if (!href.startsWith('#')) continue;

    /* A fragment that is not valid percent-encoding — `#%zz` — makes
       decodeURIComponent throw, and a guard that throws reports nothing at all
       about the rest of the page while looking like an infrastructure failure.
       Left as written: that is what getElementById would be handed too. */
    let id: string;
    try {
      id = decodeURIComponent(href.slice(1));
    } catch {
      id = href.slice(1);
    }

    if (id === '' || ids.has(id) || reported.has(id)) continue;
    reported.add(id);

    violations.push({
      rule: 'timeline',
      detail: `${path}: the tick on line ${lineNumber(clean, index)} leads to \`${href}\`, and nothing in this page has that id. The browser stays exactly where it is: the tick is pressed and the programme does not move, which on a phone reads as a tap that was not registered`,
    });
  }

  return violations;
}
