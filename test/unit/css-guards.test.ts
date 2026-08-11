/* Negative tests for the CSS guards.
 *
 * docs/piano.md asks that every guard be proved in the negative too: a guard
 * that never fires is indistinguishable from a guard that is not looking. Each
 * block below feeds in a deliberately broken stylesheet and asserts the guard
 * reports it — and a correct one, to show it does not fire at random.
 */
import { describe, expect, it } from 'vitest';
import {
  checkDuplicateDeclarations,
  checkNoColorMixOrOklch,
  checkRgbTriples,
  checkSceneHeightFallback,
  checkUndefinedCustomProperties,
  splitSupports,
  stripComments,
} from '../guards/css.ts';

const GOOD_SCENE = `
:root { --scene-height: 100vh; }
@supports (height: 100svh) {
  :root { --scene-height: 100svh; }
}
`;

describe('checkSceneHeightFallback', () => {
  it('accepts the fallback written as @supports', () => {
    expect(checkSceneHeightFallback(GOOD_SCENE)).toEqual([]);
  });

  it('accepts the minified form, with no space after the colon', () => {
    const minified = ':root{--scene-height:100vh}@supports (height:100svh){:root{--scene-height:100svh}}';
    expect(checkSceneHeightFallback(minified)).toEqual([]);
  });

  it('reports the double declaration the minifier collapses', () => {
    const broken = ':root { --scene-height: 100vh; --scene-height: 100svh; }';
    const violations = checkSceneHeightFallback(broken);
    expect(violations.map((v) => v.rule)).toContain('rule 4');
    expect(violations.some((v) => v.detail.includes('outside @supports'))).toBe(true);
  });

  it('reports a missing @supports block', () => {
    const violations = checkSceneHeightFallback(':root { --scene-height: 100vh; }');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('@supports (height: 100svh)');
  });

  it('reports a missing vh fallback', () => {
    const broken = '@supports (height: 100svh) { :root { --scene-height: 100svh; } }';
    const violations = checkSceneHeightFallback(broken);
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('Safari 15.4');
  });

  it('reports dvh anywhere as a rule 5 violation', () => {
    const broken = GOOD_SCENE + '\n.scene { min-height: 100dvh; }';
    const violations = checkSceneHeightFallback(broken);
    expect(violations.map((v) => v.rule)).toContain('rule 5');
  });

  it('does not mistake svh for vh, nor dvh for svh', () => {
    // `100svh` must not satisfy the vh fallback: the two differ by one letter
    // and that letter is the whole point of the rule.
    const onlySvh = ':root { --scene-height: 100svh; }';
    expect(checkSceneHeightFallback(onlySvh).length).toBeGreaterThan(0);
  });

  it('reads a token name other than the default', () => {
    // The parameter is what let the guard survive the rename of PR 2 —
    // `--h-scena` became `--scene-height` and only the default moved. It stays
    // exercised so the next rename is just as cheap.
    const renamed = `
      :root { --viewport-height: 100vh; }
      @supports (height: 100svh) { :root { --viewport-height: 100svh; } }
    `;
    expect(checkSceneHeightFallback(renamed, 'viewport-height')).toEqual([]);
  });
});

describe('checkNoColorMixOrOklch', () => {
  it('passes on rgba() with an --*-rgb triple', () => {
    const css = ':root { --text-secondary: rgba(var(--cream-100-rgb), 0.68); }';
    expect(checkNoColorMixOrOklch(css)).toEqual([]);
  });

  it('reports color-mix()', () => {
    const css = ':root { --tick: color-mix(in srgb, var(--cream-100) 60%, transparent); }';
    const violations = checkNoColorMixOrOklch(css);
    expect(violations).toHaveLength(1);
    expect(violations[0]!.rule).toBe('rule 3');
  });

  it('reports oklch()', () => {
    expect(checkNoColorMixOrOklch(':root { --cycle-2: oklch(0.72 0.147 85); }')).toHaveLength(1);
  });

  it('ignores both when they only appear inside a comment', () => {
    const css = '/* no color-mix() and no oklch() */\n:root { --a: #fff; }';
    expect(checkNoColorMixOrOklch(css)).toEqual([]);
  });
});

describe('checkRgbTriples', () => {
  it('passes when the triple matches the hex', () => {
    const css = ':root { --cream-100: #fcefd4; --cream-100-rgb: 252, 239, 212; }';
    expect(checkRgbTriples(css)).toEqual([]);
  });

  it('reports a triple that drifted by one', () => {
    const css = ':root { --cream-100: #fcefd4; --cream-100-rgb: 252, 239, 211; }';
    const violations = checkRgbTriples(css);
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('252, 239, 212');
  });

  it('handles channels that are zero', () => {
    const good = ':root { --blue-900: #001c2b; --blue-900-rgb: 0, 28, 43; }';
    expect(checkRgbTriples(good)).toEqual([]);
    const bad = ':root { --blue-900: #001c2b; --blue-900-rgb: 1, 28, 43; }';
    expect(checkRgbTriples(bad)).toHaveLength(1);
  });

  it('stays quiet about base colours that have no triple', () => {
    // Most colours legitimately have none. Iterating the other way round would
    // report a dozen false positives here.
    const css = ':root { --blue-800: #002639; --orange-500: #f26419; --black: #000000; }';
    expect(checkRgbTriples(css)).toEqual([]);
  });

  it('skips --accent-rgb, which points at another triple', () => {
    const css = '[data-cycle="2"] { --accent: var(--cycle-2); --accent-rgb: var(--cycle-2-rgb); }';
    expect(checkRgbTriples(css)).toEqual([]);
  });

  it('reports a triple whose base colour does not exist', () => {
    const violations = checkRgbTriples(':root { --ghost-rgb: 1, 2, 3; }');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('no hex base colour');
  });

  it('accepts the minified spacing produced by the build', () => {
    expect(checkRgbTriples(':root{--blue-700:#003049;--blue-700-rgb:0, 48, 73}')).toEqual([]);
  });

  it('resolves a colour inside its own block, not across the file', () => {
    // colors.css already redeclares several base colours under
    // [data-theme="paper"]. Reading the file as one flat namespace would
    // compare the :root triple against the theme's value and report a drift
    // that does not exist.
    const css = `
      :root { --cream-100: #fcefd4; --cream-100-rgb: 252, 239, 212; }
      [data-theme="paper"] { --cream-100: #000000; }
    `;
    expect(checkRgbTriples(css)).toEqual([]);
  });

  it('checks each cycle against its own accent, as PR 4 will emit them', () => {
    // The accent rules are generated one per cycle from the collection. Every
    // block declares the same two property names with different values, so
    // this is the shape that would break a file-wide index.
    const css = `
      [data-cycle="1"] { --accent: #f26419; --accent-rgb: 242, 100, 25; }
      [data-cycle="2"] { --accent: #cb9e00; --accent-rgb: 203, 158, 0; }
      [data-cycle="3"] { --accent: #3baa73; --accent-rgb: 59, 170, 115; }
    `;
    expect(checkRgbTriples(css)).toEqual([]);
  });

  it('still reports drift inside one of those blocks', () => {
    // The fix must not buy its silence by giving up on the check.
    const css = `
      [data-cycle="1"] { --accent: #f26419; --accent-rgb: 242, 100, 25; }
      [data-cycle="2"] { --accent: #cb9e00; --accent-rgb: 203, 158, 1; }
    `;
    const violations = checkRgbTriples(css);
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('203, 158, 0');
  });

  it('falls back to the rest of the file when the block agrees with it', () => {
    const css = `
      :root { --blue-900: #001c2b; }
      .bar { --blue-900-rgb: 0, 28, 43; }
    `;
    expect(checkRgbTriples(css)).toEqual([]);
  });
});

describe('checkDuplicateDeclarations', () => {
  it('passes when the fallback is in @supports', () => {
    expect(checkDuplicateDeclarations(GOOD_SCENE)).toEqual([]);
  });

  it('reports a custom property declared twice in one block', () => {
    const violations = checkDuplicateDeclarations(':root { --scene-height: 100vh; --scene-height: 100svh; }');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('--scene-height');
  });

  it('reports an ordinary property declared twice in one block', () => {
    const violations = checkDuplicateDeclarations('.scene { height: 100vh; height: 100svh; }');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('height');
  });

  it('does not flag the same property across different blocks', () => {
    const css = '.a { color: red; }\n.b { color: blue; }';
    expect(checkDuplicateDeclarations(css)).toEqual([]);
  });
});

describe('checkUndefinedCustomProperties', () => {
  it('passes when every var() has its declaration', () => {
    const css = ':root { --accent: #f26419; }\n.badge { color: var(--accent); }';
    expect(checkUndefinedCustomProperties(css)).toEqual([]);
  });

  it('reports the name a rename left behind', () => {
    // The quiet half of PR 2: the declaration became --accent, this var() did
    // not. Nothing fails — the property simply resolves to nothing.
    const css = ':root { --accent: #f26419; }\n.badge { color: var(--accento); }';
    const violations = checkUndefinedCustomProperties(css);
    expect(violations).toHaveLength(1);
    expect(violations[0]!.rule).toBe('tokens');
    expect(violations[0]!.detail).toContain('--accento');
  });

  it('accepts a reading that carries a fallback', () => {
    // `var(--accent, var(--orange-500))` is the design's own idiom for a
    // property that is only declared inside a cycle: undefined is the case it
    // was written for.
    const css = ':root { --orange-500: #f26419; }\n.b { color: var(--accent, var(--orange-500)); }';
    expect(checkUndefinedCustomProperties(css)).toEqual([]);
  });

  it('takes declarations from anywhere in the text it is given', () => {
    // The tokens live in one file and are read from another, so the guard is
    // handed all the CSS at once. Per file it would report every token.
    const css = '[data-cycle="2"] { --accent: #cb9e00; }\n.b { color: var(--accent); }';
    expect(checkUndefinedCustomProperties(css)).toEqual([]);
  });

  it('reports each missing name once', () => {
    const css = '.a { color: var(--ghost); }\n.b { border-color: var(--ghost); }';
    expect(checkUndefinedCustomProperties(css)).toHaveLength(1);
  });

  it('reads the minified form', () => {
    expect(
      checkUndefinedCustomProperties(':root{--accent:#f26419}.b{color:var(--accent)}'),
    ).toEqual([]);
  });

  it('does not count a declaration that only exists in a comment', () => {
    const css = '/* --accent: #f26419; */\n.b { color: var(--accent); }';
    expect(checkUndefinedCustomProperties(css)).toHaveLength(1);
  });
});

describe('parsing helpers', () => {
  it('stripComments keeps line numbers intact', () => {
    const css = '/* uno\n   due */\n:root { --a: #fff; }';
    const clean = stripComments(css);
    expect(clean.split('\n')).toHaveLength(3);
    expect(clean).not.toContain('due');
  });

  it('splitSupports separates the body from the rest', () => {
    const { outside, blocks } = splitSupports(GOOD_SCENE);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.condition).toBe('(height: 100svh)');
    expect(blocks[0]!.body).toContain('100svh');
    expect(outside).toContain('100vh');
    expect(outside).not.toContain('100svh');
  });

  it('splitSupports handles a nested block without losing the closing brace', () => {
    const css = '@supports (height: 100svh) { @media (min-width: 40em) { :root { --scene-height: 100svh; } } }\n.after { color: red; }';
    const { outside, blocks } = splitSupports(css);
    expect(blocks).toHaveLength(1);
    expect(outside).toContain('.after');
  });
});
