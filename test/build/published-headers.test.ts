/* The file Cloudflare reads, asked of the pages it is about.
 *
 * This is the layer that matters for `_headers`, and not by preference: the
 * policy is a list of hashes of things that only exist after a build, so the
 * source cannot be asked whether it agrees with itself. There is nothing to
 * read in src/ that would answer.
 */
import { describe, expect, it } from 'vitest';
import { checkHeaderPolicy, checkInlineHashes } from '../guards/headers.ts';
import { inlineScripts, inlineStyles } from '../../src/lib/headers.ts';
import { publishedPages } from '../support/dist.ts';
import { exists, read } from '../support/paths.ts';

const pages = publishedPages();
/* Read by name and not through readPublishedFiles(), which lists by extension:
   `_headers` has none, so the sweep that every other published-file guard runs
   on does not see it — and would have handed this one an empty string. */
const HEADERS_FILE = 'dist/_headers';
const headers = exists(HEADERS_FILE) ? read(HEADERS_FILE) : '';

describe('the headers the build writes', () => {
  it('published a _headers at all', () => {
    // Without it every assertion below would be about an empty string, and
    // Cloudflare would send a site with no policy and no security headers —
    // which looks exactly like a site with them, from the outside.
    expect(headers).not.toBe('');
  });

  it('is not also written by hand in public/', () => {
    // public/ is copied into dist/ verbatim, so a hand-written file there and
    // the generated one would be two sources for the same bytes — the same
    // defect as a hand-written `[data-cycle]` rule, and settled the same way:
    // whichever wins is decided by the order of two mechanisms nobody is
    // thinking about.
    expect(exists('public/_headers')).toBe(false);
  });

  it('is a policy and not the shape of one', () => {
    expect(checkHeaderPolicy(headers).map((v) => v.detail)).toEqual([]);
  });

  it.each(pages.map((page) => [page.path, page] as const))(
    '%s runs nothing the policy does not cover',
    (_path, page) => {
      expect(checkInlineHashes(page.html, headers, page.path).map((v) => v.detail)).toEqual([]);
    },
  );

  it('is covering inline blocks that actually exist', () => {
    // The anti-vacuity half. Every assertion above is satisfied by a site with
    // no inline scripts at all, and this site is nothing but inline scripts:
    // if that ever stops being true the policy needs rereading, not passing.
    const blocks = pages.flatMap((page) => [
      ...inlineScripts(page.html),
      ...inlineStyles(page.html),
    ]);
    expect(blocks.length).toBeGreaterThan(0);
  });

  it('changes with the script it covers', () => {
    // What a hash is for, said as an assertion: edit a byte of any inline
    // script and the page stops being covered. A guard that could not tell
    // those apart would pass everything above while the modal quietly stopped
    // opening in every browser that enforces the policy.
    const page = pages.find(({ html }) => inlineScripts(html).length > 0);
    expect(page, 'no published page carries an inline script').toBeDefined();

    const script = inlineScripts(page!.html)[0]!;
    const edited = page!.html.replace(script, `${script};`);
    expect(checkInlineHashes(edited, headers, page!.path).length).toBeGreaterThan(0);
  });
});
