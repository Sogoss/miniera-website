/* The extractor that lets the source guards reach into .astro components.
 *
 * It needs its own tests for the same reason every guard does: the .astro
 * files in the repository have no <style> block yet, so the checks that use it
 * in sources.test.ts pass vacuously today. If the extraction quietly returned
 * nothing, they would keep passing for the wrong reason — and would still be
 * passing for the wrong reason on the day the components arrive.
 */
import { describe, expect, it } from 'vitest';
import {
  checkDuplicateDeclarations,
  checkNoColorMixOrOklch,
} from '../guards/css.ts';
import {
  extractStyleAttributes,
  extractStyleBlocks,
  styleAttributesOf,
  styleBlocksOf,
} from '../support/styles.ts';
import { checkUndefinedCustomProperties } from '../guards/css.ts';

const COMPONENT = `---
const { title } = Astro.props;
---
<section class="scena"><h2>{title}</h2></section>
<style>
  .scene { color: var(--accent); }
</style>
`;

describe('extractStyleBlocks', () => {
  it('pulls the block out of a component', () => {
    expect(extractStyleBlocks(COMPONENT)).toHaveLength(1);
    expect(extractStyleBlocks(COMPONENT)[0]).toContain('--accent');
  });

  it('returns nothing for a component that has no styles', () => {
    expect(extractStyleBlocks('<p>niente stile</p>')).toEqual([]);
  });

  it('takes every block, and keeps the attributes off the CSS', () => {
    const many = '<style is:global>a{color:red}</style><style>b{color:blue}</style>';
    expect(extractStyleBlocks(many)).toEqual(['a{color:red}', 'b{color:blue}']);
  });

  it('does not swallow the markup between two blocks', () => {
    const mixed = '<style>a{color:red}</style><p>testo</p><style>b{color:blue}</style>';
    expect(styleBlocksOf(mixed)).not.toContain('testo');
  });
});

describe('extractStyleAttributes', () => {
  it('pulls an inline style out of the markup', () => {
    const markup = '<article style="border-top: 4px solid var(--accent);">x</article>';
    expect(extractStyleAttributes(markup)).toEqual([
      'border-top: 4px solid var(--accent);',
    ]);
  });

  it('takes single quotes as well, and skips the empty ones', () => {
    const markup = "<a style='color: red'></a><b style=\"\"></b>";
    expect(extractStyleAttributes(markup)).toEqual(['color: red']);
  });

  it('is not fooled by an attribute whose name merely ends in style', () => {
    // `data-style` is not a style attribute, and neither is a prop called
    // `cardStyle`. The leading space in the pattern is what keeps them out.
    const markup = '<div data-style="color: red" cardStyle="color: blue"></div>';
    expect(extractStyleAttributes(markup)).toEqual([]);
  });

  it('wraps each attribute in its own block', () => {
    // One block each, so that a guard reads a declaration as a declaration —
    // they recognise one by the `{` or `;` in front of it — and so that two
    // attributes declaring the same property are not read as a duplicate.
    const markup = '<a style="color: red"></a><b style="color: blue"></b>';
    expect(styleAttributesOf(markup)).toBe(
      '[style] { color: red }\n[style] { color: blue }',
    );
  });

  it('lets the undefined-property guard see a token read from the markup', () => {
    // The gap this closes: an inline style is in no stylesheet at all, so a
    // var() written there survived every guard in the suite.
    const markup = '<article style="border-top: 4px solid var(--accento);"></article>';
    const violations = checkUndefinedCustomProperties(styleAttributesOf(markup));
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('--accento');
  });
});

describe('the guards, reached through the extractor', () => {
  it('sees a rule 4 double declaration in a component style', () => {
    // This is the case dist/ can never report: by the time the CSS is
    // published the minifier has collapsed the two lines into one and the
    // fallback is simply gone, with nothing left to detect.
    const broken = COMPONENT.replace(
      '.scene { color: var(--accent); }',
      '.scene { height: 100vh; height: 100svh; }',
    );
    const violations = checkDuplicateDeclarations(styleBlocksOf(broken));
    expect(violations).toHaveLength(1);
    expect(violations[0]!.rule).toBe('rule 4');
  });

  it('sees a rule 3 color-mix() in a component style', () => {
    const broken = COMPONENT.replace(
      'var(--accent)',
      'color-mix(in srgb, var(--accent) 60%, transparent)',
    );
    expect(checkNoColorMixOrOklch(styleBlocksOf(broken))).toHaveLength(1);
  });

  it('ignores CSS-looking text that is not in a style block', () => {
    const markup = '<p>si scrive height: 100vh; height: 100svh;</p>';
    expect(checkDuplicateDeclarations(styleBlocksOf(markup))).toEqual([]);
  });
});
