/* One evening, one address — as it reaches a browser.
 *
 * `/81` is not a different page from the programme: it is the programme opened
 * on the eighty-first evening, carrying its title, its description and its
 * picture in the head. Which is the whole reason the address exists, so what
 * these read out of dist/ is the head as much as the body.
 *
 * Everything expected here comes from the content. Written as literals, adding
 * an evening would turn the suite red with nothing broken and point at this
 * file instead of at the programme.
 */
import { describe, expect, it } from 'vitest';
import { attributeOf } from '../guards/document.ts';
import { checkEveningRoutes } from '../guards/routes.ts';
import { decodeEntities, publishedPages, readPublishedCss } from '../support/dist.ts';
import { collectionEntries } from '../support/frontmatter.ts';
import { sortByNumber } from '../../src/lib/events.ts';
import astroConfig from '../../astro.config.mjs';

const pages = publishedPages();
const withDomain = Boolean((astroConfig as { site?: string }).site);

/** The evenings as the content has them, in the order of the site. */
const evenings = sortByNumber(
  collectionEntries('eventi').map((entry) => ({
    number: Number(entry.data.number),
    title: String(entry.data.title ?? ''),
    cancelled: entry.data.cancelled === true,
    photo: typeof entry.data.photo === 'string' ? entry.data.photo : undefined,
  })),
);

/** The routes the build produced, by the number they are named for. */
const routes = new Map(
  pages
    .map((page) => ({ page, found: /^dist\/(\d+)\/index\.html$/.exec(page.path) }))
    .filter((entry): entry is { page: (typeof pages)[number]; found: RegExpExecArray } =>
      entry.found !== null,
    )
    .map(({ page, found }) => [found[1]!, page]),
);

const home = pages.find((page) => page.path === 'dist/index.html');

/** Every scene of a published programme, with its opening tag. */
function scenesOf(html: string): string[] {
  return [...html.matchAll(/<section\b[^>]*\bdata-scene\b[^>]*>/g)].map((match) => match[0]);
}

/** The scene a route opens on. */
function openingSceneOf(html: string): string | undefined {
  return scenesOf(html).find((scene) => attributeOf(scene, 'data-open') === 'true');
}

function metaContent(html: string, name: string): string | undefined {
  const tag = new RegExp(
    `<meta\\b[^>]*(?:name|property)="${name}"[^>]*>|<meta\\b[^>]*content="[^"]*"[^>]*(?:name|property)="${name}"`,
    'i',
  ).exec(html)?.[0];
  return tag ? decodeEntities(attributeOf(tag, 'content') ?? '') : undefined;
}

describe('the published evenings', () => {
  it('give every evening an address of its own', () => {
    // Without this every loop below runs over an empty map and agrees.
    expect(evenings.length).toBeGreaterThan(1);
    expect([...routes.keys()].map(Number).sort((a, b) => a - b)).toEqual(
      evenings.map((evening) => evening.number),
    );
  });

  it.each(evenings.map((evening) => [evening.number, evening] as const))(
    '/%s opens the programme on its own evening',
    (number, evening) => {
      const page = routes.get(String(number));
      expect(page, `/${number} is not in dist/`).toBeDefined();

      // The whole programme is on every route — that is what makes this one
      // document and not eighty-one — so what tells them apart is which scene
      // carries `data-open`.
      expect(scenesOf(page!.html)).toHaveLength(evenings.length);
      expect(attributeOf(openingSceneOf(page!.html) ?? '', 'data-number')).toBe(String(number));

      // And the head, which is the reason the address exists at all.
      expect(page!.html).toContain(`Serata ${number} —`);
      expect(metaContent(page!.html, 'og:title')).toContain(evening.title);
    },
  );

  it('opens the root on the next evening that will take place', () => {
    // Stated as the contract rather than recomputed from a clock: the evening
    // the root opens on is still to come, and everything before it in the order
    // of the site has either happened or been called off. A cancelled evening
    // is not an appointment — decisioni.md — so it is skipped, and evening 80
    // of the sample content is there to make that branch visible in dist/.
    expect(home, 'dist/index.html is not in dist/').toBeDefined();

    const scenes = scenesOf(home!.html);
    const opening = scenes.findIndex((scene) => attributeOf(scene, 'data-open') === 'true');
    expect(opening).toBeGreaterThanOrEqual(0);
    expect(attributeOf(scenes[opening]!, 'data-state')).toBe('upcoming');

    for (const scene of scenes.slice(0, opening)) {
      expect(attributeOf(scene, 'data-state'), 'an evening still to come was skipped').not.toBe(
        'upcoming',
      );
    }
  });

  it('tells the routes apart by their heading, not only by their head', () => {
    // Eighty-one documents with the same body and different meta are duplicate
    // content. The hidden <h1> is the one thing inside the body that names the
    // evening a route is for — checkDocumentBasics already asks that there be
    // exactly one of them on every page.
    const headings = [...routes.entries()].map(
      ([number, page]) => [number, /<h1\b[^>]*>([\s\S]*?)<\/h1>/.exec(page.html)?.[1] ?? ''] as const,
    );

    for (const [number, heading] of headings) {
      expect(heading, `/${number} has no heading of its own`).toContain(`Serata ${number}`);
    }
    expect(new Set(headings.map(([, heading]) => heading)).size).toBe(headings.length);

    // And the root keeps one that speaks for the site: it is «the next
    // evening», whenever it is read, and naming a particular Thursday there
    // would be an address that ages.
    expect(/<h1\b[^>]*>([\s\S]*?)<\/h1>/.exec(home!.html)?.[1]).not.toContain('Serata ');
  });

  it('describes each route with its own evening and not with the site', () => {
    const descriptions = [...routes.values()].map((page) => metaContent(page.html, 'description'));
    expect(descriptions.every(Boolean)).toBe(true);
    expect(new Set(descriptions).size).toBe(descriptions.length);
    expect(descriptions).not.toContain(metaContent(home!.html, 'description'));

    // og:description says the same thing as the meta: two sentences about the
    // same page are two chances to update one of them.
    for (const page of routes.values()) {
      expect(metaContent(page.html, 'og:description')).toBe(metaContent(page.html, 'description'));
    }
  });

  it.runIf(withDomain)('previews each evening with its own picture', () => {
    // Armed by the domain arriving, exactly like the assertion on og:url: until
    // `site` is set the layout publishes no og:image at all, because a relative
    // one looks right in the markup and produces a preview with no picture.
    for (const evening of evenings.filter((candidate) => candidate.photo)) {
      const preview = metaContent(routes.get(String(evening.number))!.html, 'og:image');
      expect(preview, `/${evening.number} has a photo and no preview`).toBeDefined();
      expect(preview).toMatch(/^https?:\/\//);
    }
  });

  it('keeps a cancelled evening, with its number, its page and its state', () => {
    // The number is burned on purpose: whoever was already sent /80 must not
    // find a 404 there — contenuti.md. And the state has to reach dist/, or the
    // rule below has nothing to land on.
    const cancelled = evenings.filter((evening) => evening.cancelled);
    expect(cancelled.length, 'no sample evening is cancelled').toBeGreaterThan(0);

    for (const evening of cancelled) {
      const page = routes.get(String(evening.number));
      expect(page, `/${evening.number} is cancelled and has no page`).toBeDefined();

      const scene = scenesOf(page!.html).find(
        (candidate) => attributeOf(candidate, 'data-number') === String(evening.number),
      );
      expect(attributeOf(scene ?? '', 'data-state')).toBe('cancelled');
    }
  });

  it('strikes a cancelled evening through, in the CSS this page receives', () => {
    // Hung on the attribute the domain decides, not on a class somebody sets by
    // hand: `stateOf` answers this question once and every part of the site
    // asks it of the same place.
    expect(readPublishedCss()).toMatch(/\[data-state=["']?cancelled["']?\][^{]*\{[^}]*line-through/);
  });

  it.each(pages.map((page) => [page.path, page] as const))(
    '%s writes no address the site does not serve',
    (_path, page) => {
      // The script puts `/` + data-number into the address bar as the reader
      // reaches an evening. A number with no route is a 404 that only shows up
      // on a reload or in somebody else's chat.
      expect(checkEveningRoutes(page.html, routes.keys(), page.path)).toEqual([]);
    },
  );
});
