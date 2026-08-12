/* The design system, as it reaches a browser.
 *
 * The gallery page is published so that this layer has something to read: for
 * style the source is not enough — the minifier can take things out — and a
 * component whose variant lost its background between the `<style>` block and
 * `dist/` looks perfectly fine in the source of both.
 *
 * Everything here is asked of **the CSS that page actually receives**, not of
 * dist/ as a whole: Astro emits a stylesheet per entrypoint, so «the rule
 * exists somewhere» would pass on a page that never gets it.
 *
 * The expectations are token *names*, never colours. A hex written into a test
 * would go red the day a cycle is retuned in the CMS — pointing at a test file
 * instead of at the content that changed.
 */
import { describe, expect, it } from 'vitest';
import { checkClipShapeReferences } from '../guards/shapes.ts';
import { decodeEntities, publishedPages } from '../support/dist.ts';

const GALLERY = 'dist/componenti/index.html';

const pages = publishedPages();
const gallery = pages.find((page) => page.path === GALLERY);

/** The declarations of the first rule whose selector contains `fragment`. */
function declarationsFor(css: string, fragment: string): string {
  /* The minifier drops the quotes from an attribute selector — `[data-variant=
     primary]`, not `[data-variant="primary"]` — so the fragment is matched
     against both spellings, and the published one is the one that will be
     there. */
  const bare = fragment.replace(/["']/g, '');
  const index = css.replace(/["']/g, '').indexOf(bare);
  if (index === -1) return '';
  const open = css.indexOf('{', index);
  const close = css.indexOf('}', open);
  return open === -1 || close === -1 ? '' : css.slice(open + 1, close);
}

describe('the component gallery', () => {
  it('is published', () => {
    // Everything below reads this page; without it they would all pass over
    // nothing. It is also the assertion that fails first if the gallery is
    // renamed, with the old path in the message.
    expect(gallery, `${GALLERY} is not in dist/`).toBeDefined();
  });

  it('stays out of the index', () => {
    // A service page in a search result is not a broken site, which is why it
    // needs saying here: nothing else would ever notice.
    expect(gallery!.html).toMatch(/<meta[^>]*name="robots"[^>]*content="noindex/i);
  });

  it.each([
    ['Button', 'button'],
    ['Label', 'label'],
    ['Card', 'card'],
    ['Brand', 'brand'],
    ['SignatureBand', 'signature-band'],
    ['EpisodeBadge', 'episode-badge'],
    ['GuestRow', 'guest-row'],
    ['EventCard', 'event-card'],
  ])('publishes %s', (_name, className) => {
    // Class names survive the build — Astro scopes with a `data-astro-cid-*`
    // attribute and leaves the class alone — so this is a stable thing to ask
    // for, unlike the scoping hash.
    expect(gallery!.html).toContain(`class="${className}"`);
  });

  it.each([
    ['primary', ['--accent', '--text-on-accent']],
    ['secondary', ['--text-primary', '--border-strong']],
    ['flat', ['--text-accent']],
  ])('dresses the %s button in the tokens it is meant to', (variant, tokens) => {
    const rule = declarationsFor(gallery!.css, `.button[data-astro-cid`);
    expect(rule, 'no .button rule in the CSS this page receives').not.toBe('');

    const variantRule = declarationsFor(gallery!.css, `[data-variant=${variant}]`);
    for (const token of tokens) {
      expect(variantRule, `the ${variant} button does not read ${token}`).toContain(token);
    }
  });

  it.each([
    ['accent', ['--accent', '--text-on-accent']],
    ['outline', ['--text-primary', '--border-hairline']],
    ['filled', ['--surface-invert', '--text-on-invert']],
  ])('dresses the %s label in the tokens it is meant to', (tone, tokens) => {
    const rule = declarationsFor(gallery!.css, `[data-tone=${tone}]`);
    for (const token of tokens) {
      expect(rule, `the ${tone} label does not read ${token}`).toContain(token);
    }
  });

  it('keeps the pressed effect in CSS, where no script is needed for it', () => {
    // The one component that had state in the export. If `:active` were lost
    // the button would still render, still work, and simply stop moving.
    expect(gallery!.css.replace(/\s/g, '')).toContain(':active{transform:translateY(2px)}');
  });

  it('clips the guest portrait with the shape the design uses', () => {
    // The first real clip on the site. Before this the reference guard passed
    // over an empty list of references on every page — true, and about nothing.
    expect(gallery!.css).toContain('url(#clip-clover-8)');
    expect(checkClipShapeReferences(gallery!.html, gallery!.css, GALLERY)).toEqual([]);
  });

  it('asks for a shape somewhere, so that the reference guard has work to do', () => {
    // What the assertion above cannot say on its own: that the guard is looking
    // at something. A site that clipped nothing would satisfy it in silence.
    const asking = pages.filter((page) => /url\(#clip-/.test(`${page.html}${page.css}`));
    expect(asking.length).toBeGreaterThan(0);
  });

  it('uses the brand in full, at every size it shows it at', () => {
    // Rule 7 is guarded over every page; this is the size question underneath
    // it — the gallery shows the mark down to 13px, which is where somebody
    // reaches for the short variant.
    const marks = decodeEntities(gallery!.html).match(/in Periferia/g) ?? [];
    expect(marks.length).toBeGreaterThanOrEqual(4);
  });
});
