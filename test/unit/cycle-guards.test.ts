/* Negative tests for the two guards over the cycle accents.
 *
 * The first one's negative case is not invented: it is the block this PR took
 * out of colors.css, which is the shape someone would put back believing they
 * were adding a sensible fallback.
 */
import { describe, expect, it } from 'vitest';
import {
  checkAccentContrast,
  checkCycleRulesResolve,
  checkHandWrittenCycleRules,
  contrastRatio,
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

  it('reports a hand-written triple as well as a hand-written colour', () => {
    // Half a rule is the same defect: --accent-rgb written by hand drifts from
    // the colour the collection emits, and the transparencies go with it.
    expect(checkHandWrittenCycleRules('[data-cycle="3"] { --accent-rgb: 1, 2, 3; }')).toHaveLength(1);
  });

  it('leaves alone a cycle rule that declares no accent', () => {
    // What PR 7 will legitimately write. Reporting it would turn that PR red
    // with a message about the order of the stylesheets, which does not apply
    // to a rule that cannot shadow an accent — and a guard that fires on
    // correct work is a guard that gets loosened, taking the real check with
    // it. The sibling guard in this file has always reasoned this way.
    expect(checkHandWrittenCycleRules('[data-cycle] { scroll-snap-align: start; }')).toEqual([]);
    expect(checkHandWrittenCycleRules('[data-cycle="2"] { border-color: #f26419; }')).toEqual([]);
  });

  it('leaves alone an attribute that merely starts the same way', () => {
    // `\\b` matched `[data-cycle-label]`, which is a different attribute.
    expect(checkHandWrittenCycleRules('[data-cycle-label] { display: none; }')).toEqual([]);
    expect(checkHandWrittenCycleRules('[data-cycle-label] { --accent: red; }')).toEqual([]);
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

describe('checkAccentContrast', () => {
  const ground = '#003049';
  const cycle = (color: string) => ({ number: 6, name: 'Turni', color });

  it('accepts the five tuned colours of the design and the sixth', () => {
    for (const color of ['#f26419', '#cb9e00', '#3baa73', '#e05a81', '#ac70c6', '#00a9b0']) {
      expect(checkAccentContrast(cycle(color), ground), color).toEqual([]);
    }
  });

  it('reports a colour that is nearly the ground itself', () => {
    // A valid six-digit hex, accepted by the schema and by the generator, that
    // publishes a kicker nobody can read. Until this PR the CSS read a token
    // and an editor could not get here.
    const violations = checkAccentContrast(cycle('#0a3550'), ground, 'src/content/cicli/6-turni.md');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('src/content/cicli/6-turni.md');
    expect(violations[0]!.detail).toContain('#0a3550');
    expect(violations[0]!.detail).toContain(':1');
  });

  it('reports a dark colour as well as a dull one', () => {
    expect(checkAccentContrast(cycle('#000000'), ground)).toHaveLength(1);
    expect(checkAccentContrast(cycle('#123456'), ground)).toHaveLength(1);
  });

  it('says so rather than passing when a colour cannot be read', () => {
    expect(checkAccentContrast(cycle('rosso'), ground)).toHaveLength(1);
    expect(checkAccentContrast(cycle('#00a9b0'), 'nero')).toHaveLength(1);
  });

  it('asks for more when the accent is written on rather than drawn with', () => {
    // The threshold is a parameter because since PR 13 the accent is both: a
    // border on a scene wants 3:1, and the current voice of the navigation is a
    // word in `--text-on-accent` over the cycle's colour, which wants 4.5. A
    // colour at 3.66:1 against the ink passes as an interface element and fails
    // as a background for a label — and that difference is the whole reason the
    // second call exists.
    expect(checkAccentContrast(cycle('#666666'), '#000000')).toEqual([]);
    const violations = checkAccentContrast(cycle('#666666'), '#000000', 'a.md', 4.5);
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('4.5:1');
    expect(violations[0]!.detail).toContain('navigation');
  });

  it('computes the ratios the palette was chosen with', () => {
    // The numbers quoted in docs/decisioni.md, so that the prose and the guard
    // cannot drift apart in silence.
    expect(contrastRatio('#00a9b0', ground)!).toBeCloseTo(4.81, 1);
    expect(contrastRatio('#cb9e00', ground)!).toBeCloseTo(5.55, 1);
    expect(contrastRatio('#ac70c6', ground)!).toBeCloseTo(3.88, 1);
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

  it('does not read a commented-out scene as a cycle in use', () => {
    // Astro copies markup comments into dist/ as they are. A scene left in
    // draft would otherwise fail the build over a page that renders perfectly,
    // and the message would name a component that is right there.
    const draft = '<!-- <article data-cycle="9">bozza</article> --><article data-cycle="2"></article>';
    expect(checkCycleRulesResolve(draft, EMITTED)).toEqual([]);
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
