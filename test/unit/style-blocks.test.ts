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
import { extractStyleBlocks, styleBlocksOf } from '../support/styles.ts';

const COMPONENT = `---
const { title } = Astro.props;
---
<section class="scena"><h2>{title}</h2></section>
<style>
  .scena { color: var(--accento); }
</style>
`;

describe('extractStyleBlocks', () => {
  it('pulls the block out of a component', () => {
    expect(extractStyleBlocks(COMPONENT)).toHaveLength(1);
    expect(extractStyleBlocks(COMPONENT)[0]).toContain('--accento');
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

describe('the guards, reached through the extractor', () => {
  it('sees a rule 4 double declaration in a component style', () => {
    // This is the case dist/ can never report: by the time the CSS is
    // published the minifier has collapsed the two lines into one and the
    // fallback is simply gone, with nothing left to detect.
    const broken = COMPONENT.replace(
      '.scena { color: var(--accento); }',
      '.scena { height: 100vh; height: 100svh; }',
    );
    const violations = checkDuplicateDeclarations(styleBlocksOf(broken));
    expect(violations).toHaveLength(1);
    expect(violations[0]!.rule).toBe('rule 4');
  });

  it('sees a rule 3 color-mix() in a component style', () => {
    const broken = COMPONENT.replace(
      'var(--accento)',
      'color-mix(in srgb, var(--accento) 60%, transparent)',
    );
    expect(checkNoColorMixOrOklch(styleBlocksOf(broken))).toHaveLength(1);
  });

  it('ignores CSS-looking text that is not in a style block', () => {
    const markup = '<p>si scrive height: 100vh; height: 100svh;</p>';
    expect(checkDuplicateDeclarations(styleBlocksOf(markup))).toEqual([]);
  });
});
