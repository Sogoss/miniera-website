/* The booking, as it reaches a browser.
 *
 * There is no backend: holding a seat is a link to WhatsApp, so everything that
 * can go wrong here goes wrong silently. A link with the wrong digits opens a
 * chat with a stranger; a button with no fallback disappears for a reader with
 * no scripting; the placeholder of the design opens a chat with nobody. Not one
 * of those fails a build or shows up on a screenshot.
 *
 * Everything expected here is derived: the number from src/lib/contact.ts, and
 * which evenings are bookable from `data-state` in dist/. Written as literals,
 * the number would be the second copy this whole PR exists to forbid, and the
 * evenings would turn the suite red on their own the day one of them passes.
 */
import { describe, expect, it } from 'vitest';
import { checkPlaceholderNumber } from '../guards/contact.ts';
import { checkLinksOutsideTemplates } from '../guards/modal.ts';
import { decodeEntities, publishedPages, readPublishedFiles } from '../support/dist.ts';
import {
  PLACEHOLDER_NUMBER,
  WHATSAPP_NUMBER,
  bookingMessage,
  whatsappDigits,
} from '../../src/lib/contact.ts';

const HOME = 'dist/index.html';
const pages = publishedPages();
const home = pages.find((page) => page.path === HOME);
const html = home?.html ?? '';

const digits = whatsappDigits(WHATSAPP_NUMBER);

/** Every scene of the published programme, from its opening tag to its own
 *  closing one — the modal and the scripts live outside them. */
function scenes(markup: string): { number: string; state: string; markup: string }[] {
  return [...markup.matchAll(/<section\b[^>]*\bdata-scene\b[^>]*>/g)].map((match) => {
    const to = markup.indexOf('</section>', match.index);
    return {
      number: /\bdata-number="([^"]*)"/.exec(match[0])?.[1] ?? '',
      state: /\bdata-state="([^"]*)"/.exec(match[0])?.[1] ?? '',
      markup: markup.slice(match.index, to === -1 ? undefined : to),
    };
  });
}

const published = scenes(html);
const bookable = published.filter((scene) => scene.state === 'upcoming');

/** Every WhatsApp address in a piece of markup, with the entities resolved —
 *  the `&amp;` of an href is not part of the address. */
function whatsappLinks(markup: string): string[] {
  return [...markup.matchAll(/https:\/\/wa\.me\/[^"'\s<>]+/g)].map((match) =>
    decodeEntities(match[0]),
  );
}

describe('the published booking', () => {
  it('has a programme with an evening still to come in it', () => {
    // Without this every loop below runs over an empty list and agrees. The
    // sample content is kept ahead of today for exactly this reason.
    expect(home, `${HOME} is not in dist/`).toBeDefined();
    expect(published.length).toBeGreaterThan(1);
    expect(bookable.length, 'no upcoming evening in the sample content').toBeGreaterThan(0);
  });

  it('writes every link to the number the domain holds', () => {
    const links = whatsappLinks(html);
    expect(links.length, 'no WhatsApp link in the programme at all').toBeGreaterThan(0);
    for (const link of links) {
      expect(link, `${link} does not write to the configured number`).toContain(`wa.me/${digits}?`);
    }
  });

  it('names the evening in the message each link carries', () => {
    // More than one evening is open at a time. A message with no evening in it
    // is a question the president has to ask back, and nothing about the link
    // would look wrong.
    for (const scene of bookable) {
      const links = whatsappLinks(scene.markup);
      expect(links.length, `evening #${scene.number} has no WhatsApp link`).toBeGreaterThan(0);
      for (const link of links) {
        const text = decodeURIComponent(link.split('?text=')[1] ?? '');
        expect(text, `evening #${scene.number} sends an empty message`).not.toBe('');
        expect(text).toContain(`serata ${scene.number}`);
      }
    }
  });

  it('builds that message the way the domain does', () => {
    // Read back through the module rather than compared to a sentence written
    // here: the wording is a decision of the domain, and a copy of it in a test
    // turns red when somebody improves it, pointing at this file.
    const scene = bookable[0]!;
    const title = decodeEntities(/<h2[^>]*>([\s\S]*?)<\/h2>/.exec(scene.markup)?.[1] ?? '');
    const text = decodeURIComponent(whatsappLinks(scene.markup)[0]!.split('?text=')[1] ?? '');
    expect(text).toBe(bookingMessage(Number(scene.number), title));
  });

  it('offers the booking on the evenings that can still be booked, and on no others', () => {
    for (const scene of published) {
      const opens = [...scene.markup.matchAll(/data-modal-from="booking-(\d+)"/g)];
      if (scene.state === 'upcoming') {
        expect(opens.map((match) => match[1]), `evening #${scene.number}`).toEqual([scene.number]);
      } else {
        // A past or cancelled evening with a booking button is a seat sold for
        // a night that has happened.
        expect(opens, `evening #${scene.number} is ${scene.state} and offers a booking`)
          .toHaveLength(0);
        expect(whatsappLinks(scene.markup), `evening #${scene.number} is ${scene.state}`)
          .toHaveLength(0);
      }
    }
  });

  it('carries both forms of the button, so neither reader is left with nothing', () => {
    // The button opens the panel and the link stands in for it when no script
    // runs; the CSS shows whichever is going to work. One without the other is
    // either a dead button or a modal nobody opens.
    for (const scene of bookable) {
      expect(scene.markup, `evening #${scene.number} has no button`).toMatch(
        /<button[^>]*class="[^"]*\bonly-js\b/,
      );
      expect(scene.markup, `evening #${scene.number} has no fallback link`).toMatch(
        /<a[^>]*class="[^"]*\bno-js-only\b/,
      );
    }
  });

  it('keeps that fallback link out of the template it fills', () => {
    // The panel is a <template>: markup the browser parses and does not render.
    // The link that stands in for the button cannot live in there — inside one
    // it is invisible to a reader with no scripting, to a crawler and to
    // Ctrl+F, which is the whole failure this guard was written for.
    const links = bookable.map(
      (scene) => whatsappLinks(scene.markup).find((link) => link.includes(digits))!,
    );
    expect(links.length).toBe(bookable.length);
    expect(checkLinksOutsideTemplates(html, links, HOME)).toEqual([]);
  });

  it('gives the panel of an evening the id its button asks for', () => {
    // checkModalTargets says as much on every page; what this adds is that the
    // targets are per evening now, so a button and a panel belonging to two
    // different evenings would satisfy that guard and open the wrong text.
    for (const scene of bookable) {
      expect(scene.markup).toContain(`<template id="booking-${scene.number}"`);
    }
  });

  it('does not publish the placeholder of the design anywhere', () => {
    // Still written in design-export/, which is the specification and not code
    // that ships — so the way it reaches dist/ is somebody copying a line.
    const files = readPublishedFiles();
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(checkPlaceholderNumber(file.text, PLACEHOLDER_NUMBER, file.path).map((v) => v.detail))
        .toEqual([]);
    }
  });

  it('offers the booking on the route of an evening too, not only on the programme', () => {
    // `/82` is the same programme opened on that evening, so this is really an
    // assertion that the two routes share one component. Copied instead, the
    // booking would be right on one of them and stale on the other.
    const scene = bookable[0]!;
    const route = pages.find((page) => page.path === `dist/${scene.number}/index.html`);
    expect(route, `/${scene.number} is not in dist/`).toBeDefined();
    expect(whatsappLinks(route!.html)).toEqual(whatsappLinks(html));
  });
});
