/* The accent of every cycle, as it reaches the browser.
 *
 * The source cannot answer this one. `data-cycle={n}` is an expression until
 * the build, the rules do not exist as text anywhere in src/, and the whole
 * defect this PR is about — a colour written in a content file that arrives
 * nowhere — is invisible in a diff: the page renders, in the wrong colour.
 *
 * Every expectation is derived from src/content/cicli, never written out here.
 * A literal `#00a9b0` in this file would turn the suite red the day an editor
 * retunes a cycle, with the failure pointing at a test instead of at the
 * content — which is how a suite teaches people not to touch the content.
 */
import { describe, expect, it } from 'vitest';
import { rgbTriple } from '../../src/lib/cycles.ts';
import { checkCycleRulesResolve } from '../guards/cycles.ts';
import { publishedPages, readPublishedCss } from '../support/dist.ts';
import { collectionEntries } from '../support/frontmatter.ts';
import { read } from '../support/paths.ts';

const css = readPublishedCss();

const cycles = collectionEntries('cicli').map((entry) => ({
  path: entry.path,
  number: Number(entry.data.number),
  color: String(entry.data.color ?? '').toLowerCase(),
}));

/** The five colours colors.css still declares as the palette of the design. */
const defaults = new Set(
  [...read('src/styles/tokens/colors.css').matchAll(/--cycle-\d+\s*:\s*(#[0-9a-fA-F]{6})/g)].map(
    (match) => match[1]!.toLowerCase(),
  ),
);

/** The declarations inside the rule published for a cycle, or null. */
function accentRule(number: number): string | null {
  const pattern = new RegExp(
    `\\[\\s*data-cycle\\s*=\\s*["']?${number}["']?\\s*\\]\\s*\\{([^}]*)\\}`,
  );
  return pattern.exec(css)?.[1] ?? null;
}

function valueOf(body: string, property: string): string | null {
  const pattern = new RegExp(`--${property}\\s*:\\s*([^;}]+)`);
  return pattern.exec(body)?.[1]?.trim().toLowerCase() ?? null;
}

describe('the accents published from the collection', () => {
  it('has cycles and CSS to check in the first place', () => {
    // Every loop below passes vacuously on an empty collection or an empty
    // stylesheet, which is precisely the state this PR exists to make visible.
    expect(cycles.length).toBeGreaterThan(0);
    expect(css.length).toBeGreaterThan(0);
  });

  it('gives every cycle in the collection the colour its own file declares', () => {
    for (const cycle of cycles) {
      const rule = accentRule(cycle.number);
      expect(rule, `${cycle.path} has no [data-cycle="${cycle.number}"] rule in dist/`).not.toBeNull();
      expect(valueOf(rule!, 'accent'), `${cycle.path} publishes another colour`).toBe(cycle.color);
    }
  });

  it('publishes the triple of that colour and not of a default', () => {
    // The half nobody notices they have broken: with the triple out of step
    // every transparency of the accent — rgba(var(--accent-rgb), …) — is a
    // different colour from the accent itself, and only just enough to look
    // like a design decision.
    for (const cycle of cycles) {
      const rule = accentRule(cycle.number)!;
      expect(valueOf(rule, 'accent-rgb'), `${cycle.path} publishes a drifted triple`).toBe(
        rgbTriple(cycle.color),
      );
    }
  });

  it('keeps a cycle whose colour is none of the five defaults', () => {
    // Without one, every assertion above would pass on a build that ignored the
    // collection entirely and published the old hand-written rules: the colours
    // would match by coincidence. The sample content has to keep exercising it.
    const strays = cycles.filter((cycle) => !defaults.has(cycle.color));
    expect(strays.length, 'no cycle in src/content/cicli/ strays from the design palette')
      .toBeGreaterThan(0);

    for (const cycle of strays) {
      expect(css).toContain(`--accent: ${cycle.color}`);
    }
  });

  it('keeps a cycle numbered beyond the fifth', () => {
    // colors.css declares five. Nothing is supposed to stop at five any more,
    // and this is what says so out of the published file.
    const beyond = cycles.filter((cycle) => cycle.number > 5);
    expect(beyond.length, 'no cycle in src/content/cicli/ is numbered beyond the fifth')
      .toBeGreaterThan(0);

    for (const cycle of beyond) {
      expect(accentRule(cycle.number), `cycle #${cycle.number} stops at the palette`).not.toBeNull();
    }
  });

  it('writes the accent as a literal hex, which is what makes the triple checkable', () => {
    // checkRgbTriples skips `--accent-rgb: var(--cycle-N-rgb)` — a pointer, not
    // a triple — so while the accents were written that way the guard passed on
    // them without looking at anything. Going back to a pointer would put it
    // back to sleep silently, and this is the tripwire on that.
    expect(css).toMatch(/\[\s*data-cycle[^{]*\{[^}]*--accent\s*:\s*#[0-9a-f]{6}/);
  });

  it('gives every published page the rules for the cycles it declares', () => {
    // The promise the base layout of PR 5 and the pages of PR 7 and PR 9 have
    // to keep. A page carrying `data-cycle` without the CycleAccents component
    // renders every evening in the brand orange, and there is nothing else
    // anywhere that would say so.
    const pages = publishedPages();
    expect(pages.length).toBeGreaterThan(0);

    for (const page of pages) {
      expect(
        checkCycleRulesResolve(page.html, page.css, page.path).map((violation) => violation.detail),
      ).toEqual([]);
    }
  });

  it('publishes at least one page that declares a cycle', () => {
    // Otherwise the check above is a loop over pages that never declare one:
    // green, and looking at nothing.
    expect(publishedPages().some((page) => /\sdata-cycle\s*=/.test(page.html))).toBe(true);
  });
});
