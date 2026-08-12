/* Negative tests for the two guards over the cycle accents.
 *
 * The first one's negative case is not invented: it is the block this PR took
 * out of colors.css, which is the shape someone would put back believing they
 * were adding a sensible fallback.
 */
import { describe, expect, it } from 'vitest';
import {
  checkCycleRulesResolve,
  checkHandWrittenCycleRules,
} from '../guards/cycles.ts';

const EMITTED = `
[data-cycle="2"] { --accent: #cb9e00; --accent-rgb: 203, 158, 0; }
[data-cycle="6"] { --accent: #00a9b0; --accent-rgb: 0, 169, 176; }
`;

describe('checkHandWrittenCycleRules', () => {
  it('accepts a stylesheet that leaves the accents to the collection', () => {
    const tokens = `
      :root {
        --cycle-1: #f26419;
        --accent: var(--cycle-1);
      }
    `;
    expect(checkHandWrittenCycleRules(tokens, 'colors.css')).toEqual([]);
  });

  it('reports the five rules this PR removed', () => {
    const before = `
      :root, [data-cycle="1"] { --accent: var(--cycle-1); }
      [data-cycle="2"] { --accent: var(--cycle-2); }
    `;
    const violations = checkHandWrittenCycleRules(before, 'colors.css');
    expect(violations).toHaveLength(2);
    expect(violations[0]!.rule).toBe('rule 12');
    expect(violations[0]!.detail).toContain('colors.css line 2');
    expect(violations[0]!.detail).toContain('order of the stylesheets');
  });

  it('reports the form with no quotes and the one with spaces', () => {
    expect(checkHandWrittenCycleRules('[data-cycle=3]{--accent:red}')).toHaveLength(1);
    expect(checkHandWrittenCycleRules('[ data-cycle = "3" ] { --accent: red; }')).toHaveLength(1);
  });

  it('says nothing about a comment that names one', () => {
    // colors.css explains where the rules come from and names them doing it.
    // A guard that turns red on the paragraph explaining itself gets switched
    // off, and takes the rest with it.
    const documented = `
      /* The cycle is declared on the container: [data-cycle="2"].
         Everything under it that reads --accent follows. */
      :root { --accent: var(--cycle-1); }
    `;
    expect(checkHandWrittenCycleRules(documented, 'colors.css')).toEqual([]);
  });
});

describe('checkCycleRulesResolve', () => {
  const page = '<article data-cycle="2"><h2>Una serata</h2></article>';

  it('accepts a page whose cycles all have their rule', () => {
    expect(checkCycleRulesResolve(page, EMITTED, 'dist/index.html')).toEqual([]);
  });

  it('reports a page carrying the attribute without the rules', () => {
    // The whole point: this is what a page looks like when the layout of PR 5
    // or the scroller of PR 7 forgets the CycleAccents component. It renders
    // perfectly, in the brand orange, on every evening.
    const violations = checkCycleRulesResolve(page, ':root { --accent: #f26419; }', 'dist/index.html');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.rule).toBe('rule 12');
    expect(violations[0]!.detail).toContain('data-cycle="2"');
    expect(violations[0]!.detail).toContain('dist/index.html line 1');
    expect(violations[0]!.detail).toContain('CycleAccents');
  });

  it('reports a cycle that has no rule while its neighbours do', () => {
    const mixed = '<article data-cycle="2"></article><article data-cycle="9"></article>';
    const violations = checkCycleRulesResolve(mixed, EMITTED);
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('data-cycle="9"');
  });

  it('says one thing about a cycle used by twenty evenings', () => {
    const many = Array.from({ length: 20 }, () => '<article data-cycle="9"></article>').join('');
    expect(checkCycleRulesResolve(many, EMITTED)).toHaveLength(1);
  });

  it('has nothing to say about a page that declares no cycle', () => {
    expect(checkCycleRulesResolve('<p>Chi siamo</p>', '')).toEqual([]);
  });

  it('does not accept a bare [data-cycle] as the rule for a value', () => {
    // `[data-cycle] { --accent: … }` dresses every cycle the same: it is not an
    // answer to «is there a rule for this one», and taking it for one would
    // make the guard pass on exactly the page it exists for.
    const violations = checkCycleRulesResolve(page, '[data-cycle] { --accent: #f26419; }');
    expect(violations).toHaveLength(1);
  });

  it('does not take a rule that gives the cycle something other than an accent', () => {
    // Counting selectors instead of accents, this would pass: cycle 2 is named
    // by a rule, and `--accent` under it still resolves to the :root orange.
    const elsewhere = '[data-cycle="2"] { border-color: #f26419; }';
    expect(checkCycleRulesResolve(page, elsewhere)).toHaveLength(1);
  });

  it('accepts an accent declared inside a media query', () => {
    // The rules are emitted flat today, but a guard that only understands the
    // top level would be one to switch off the first time they are not.
    const nested = '@media (min-width: 40rem) { [data-cycle="2"] { --accent: #cb9e00; } }';
    expect(checkCycleRulesResolve(page, nested)).toEqual([]);
  });

  it('reads the attribute however the markup writes it', () => {
    // Astro compresses the HTML it publishes, and a value can arrive quoted
    // either way or not at all.
    expect(checkCycleRulesResolve("<article data-cycle='2'>", EMITTED)).toEqual([]);
    expect(checkCycleRulesResolve('<article data-cycle=2>', EMITTED)).toEqual([]);
    expect(checkCycleRulesResolve('<article data-cycle=9>', EMITTED)).toHaveLength(1);
  });
});
