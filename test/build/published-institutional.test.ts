/* The two institutional pages, as they reach a browser.
 *
 * Everything they say is one of two kinds, and the whole of this file is about
 * telling them apart. What the repository knows — where the association meets,
 * which number answers — has to be published from where it is kept, spelled
 * once. What the repository does not know is published as an obvious
 * placeholder, marked, and must not be able to slip out of being one.
 *
 * Neither failure shows on a screenshot. An address copied out of the design is
 * a building this association has never been in, on a page that renders
 * perfectly; a placeholder that lost its frame is lorem ipsum being read as
 * something somebody said.
 */
import { describe, expect, it } from 'vitest';
import { checkPlaceholderNumber } from '../guards/contact.ts';
import { elementsWith } from '../guards/document.ts';
import {
  checkNoPlaceholders,
  checkPlaceholderText,
} from '../guards/placeholder.ts';
import { checkStaleVenue } from '../guards/venue.ts';
import { decodeEntities, publishedPages, readPublishedFiles } from '../support/dist.ts';
import { collectionEntries } from '../support/frontmatter.ts';
import {
  EMAIL,
  PLACEHOLDER_PHONE,
  WHATSAPP_NUMBER,
  contactMessage,
  whatsappDigits,
} from '../../src/lib/contact.ts';
import { placeholderTexts } from '../../src/lib/placeholder.ts';
import { FORMER_ADDRESSES, fullAddress } from '../../src/lib/venues.ts';
import astroConfig from '../../astro.config.mjs';

const pages = publishedPages();
const about = pages.find((page) => page.path === 'dist/chi-siamo/index.html');
const contacts = pages.find((page) => page.path === 'dist/contatti/index.html');

/* Read once: `readPublishedFiles()` walks dist/ and reads every text file in
   it, and the two assertions below want the same list. */
const publishedFiles = readPublishedFiles();

const withDomain = Boolean((astroConfig as { site?: string }).site);

/** Every address the collection holds, spelled the one way. */
const addresses = collectionEntries('sedi').map((entry) =>
  fullAddress({
    name: String(entry.data.name),
    address: String(entry.data.address),
    city: String(entry.data.city),
  }),
);

describe('the institutional pages', () => {
  it('are both in dist/', () => {
    // Without this every assertion below reads an empty string and agrees.
    expect(about, 'dist/chi-siamo/index.html is not in dist/').toBeDefined();
    expect(contacts, 'dist/contatti/index.html is not in dist/').toBeDefined();
    expect(addresses.length, 'src/content/sedi/ is empty').toBeGreaterThan(0);
  });

  it.each([
    ['chi-siamo', () => about!],
    ['contatti', () => contacts!],
  ])('/%s says where the association is, in the words of the collection', (_name, page) => {
    // Not «contains an address» but «contains the one the collection spells»:
    // the two hand-written spellings this PR replaced were both correct and
    // disagreed with each other, which is what a reader who sees both reads as
    // a site that is not sure.
    const html = decodeEntities(page().html);
    const found = addresses.filter((address) => html.includes(address));
    expect(found.length, 'no address from src/content/sedi/ on the page').toBeGreaterThan(0);
  });

  it('says the same thing on the programme, which is where the evenings are', () => {
    const home = pages.find((page) => page.path === 'dist/index.html');
    const html = decodeEntities(home?.html ?? '');
    expect(addresses.some((address) => html.includes(address))).toBe(true);
  });

  it.each(publishedFiles.map((file) => [file.path, file] as const))(
    '%s does not carry the address of the design',
    (_path, file) => {
      // Written five times in design-export/, which is the specification this
      // site is translated from — so the way it arrives here is somebody
      // copying a line out of it, exactly like the telephone placeholder.
      expect(checkStaleVenue(file.text, FORMER_ADDRESSES, file.path).map((v) => v.detail))
        .toEqual([]);
    },
  );

  it.each(publishedFiles.map((file) => [file.path, file] as const))(
    '%s does not publish the landline of the design either',
    (_path, file) => {
      // `011 000 0000` is a well-formed Turin number that rings somewhere that
      // is not the association. The association has none to publish, so the
      // contacts page offers the two doors that exist.
      expect(checkPlaceholderNumber(file.text, PLACEHOLDER_PHONE, file.path).map((v) => v.detail))
        .toEqual([]);
    },
  );

  it('offers WhatsApp with a message that names no evening', () => {
    // The contacts page is not a booking: somebody writing to ask something
    // else must not open a chat about a Thursday they never mentioned.
    const html = decodeEntities(contacts!.html);
    const links = [...html.matchAll(/https:\/\/wa\.me\/(\d+)\?text=([^"'\s<>]+)/g)];
    expect(links.length, 'no WhatsApp link on the contacts page').toBeGreaterThan(0);

    for (const [, digits, text] of links) {
      expect(digits).toBe(whatsappDigits(WHATSAPP_NUMBER));
      expect(decodeURIComponent(text ?? '')).toBe(contactMessage());
    }
  });

  it('offers the address as a mailto, and says that the mailbox is not there yet', () => {
    // Kept from the design by a decision already taken — it arrives with the
    // domain — and published marked for the same reason the telephone
    // placeholder is not published at all: a way of writing to nobody.
    const html = decodeEntities(contacts!.html);
    expect(html).toContain(`mailto:${EMAIL}`);

    const marked = elementsWith(html, 'data-placeholder').some((block) =>
      html.slice(block.from, block.to).includes(`mailto:${EMAIL}`),
    );
    expect(marked, 'the address is published as though the mailbox worked').toBe(true);
  });
});

describe('the placeholders', () => {
  it.each(pages.map((page) => [page.path, page] as const))(
    '%s publishes none of them outside a marked block',
    (_path, page) => {
      // The defect this is written for is a tidy-up: the frame and the chip go,
      // the words stay, and lorem ipsum becomes what the association says.
      expect(checkPlaceholderText(decodeEntities(page.html), placeholderTexts(), page.path))
        .toEqual([]);
    },
  );

  it('has some to check, on the two pages that are made of them', () => {
    // The anti-vacuity half: with no placeholder published anywhere, every
    // assertion above passes over nothing, on every page, for ever.
    for (const page of [about!, contacts!]) {
      const blocks = elementsWith(page.html, 'data-placeholder');
      expect(blocks.length, `${page.path} carries no marked block`).toBeGreaterThan(0);
    }

    const published = placeholderTexts().filter((text) =>
      decodeEntities(about!.html).includes(text),
    );
    expect(published.length, 'no placeholder sentence reached the page').toBeGreaterThan(3);
  });

  it('tells the reader, and not only the markup', () => {
    // `data-placeholder` is for the guard; the frame and the chip are for
    // whoever opens the page. One without the other is either an unmarked
    // placeholder or an invisible warning.
    for (const page of [about!, contacts!]) {
      expect(page.html, `${page.path} shows no placeholder chip`).toContain('Segnaposto');
      expect(page.css, `${page.path} draws no frame around a placeholder`).toMatch(
        /\.placeholder[^{]*\{[^}]*dashed/,
      );
    }
  });

  it.each(pages.map((page) => [page.path, page] as const))(
    '%s carries none at all once the site has a domain',
    (_path, page) => {
      /* Armed by `site` in astro.config.mjs, exactly as `og:url` is: on the day
         PR 20 sets the domain this turns red, and the only way past it is the
         real text. That is deliberate and it is written down in
         docs/questioni-aperte.md — a real address with lorem ipsum under it is
         the one thing worse than no address. */
      if (!withDomain) return;
      expect(checkNoPlaceholders(page.html, page.path)).toEqual([]);
    },
  );
});
