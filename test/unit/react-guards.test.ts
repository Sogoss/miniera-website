/* Negative tests for the guards over rule 9.
 *
 * None of the three defects fails a build: a dependency is just a dependency,
 * an island renders correctly, and a runtime in dist/ only costs a visitor
 * their bandwidth. What they cost is the decision — and a decision nobody is
 * holding is a decision that has been reversed without anyone saying so.
 */
import { describe, expect, it } from 'vitest';
import {
  checkNoClientDirectives,
  checkNoReactRuntime,
  checkNoUiFramework,
} from '../guards/react.ts';

describe('checkNoUiFramework', () => {
  it('accepts a manifest with nothing to render in a browser', () => {
    expect(
      checkNoUiFramework({
        dependencies: { astro: '^7.2.0', sharp: '^0.35.3' },
        devDependencies: { vitest: '^4.1.10' },
      }),
    ).toEqual([]);
  });

  it('reports React wherever it is declared', () => {
    const violations = checkNoUiFramework({
      dependencies: { react: '^19.0.0' },
      devDependencies: { '@astrojs/react': '^4.0.0' },
    });
    expect(violations).toHaveLength(2);
    expect(violations[0]!.detail).toContain('react');
  });

  it('reports the smaller React as well', () => {
    // «It's only 3KB» is how this decision comes back. The argument was never
    // the size: eight presentational components do not need a runtime at all.
    expect(checkNoUiFramework({ dependencies: { preact: '^10.0.0' } })).toHaveLength(1);
  });

  it('does not fire on a package that merely contains the letters', () => {
    // A guard that reported `react-aria-parser` or some such would be switched
    // off by whoever needed it. Names are matched whole.
    expect(
      checkNoUiFramework({ dependencies: { 'preact-render-to-string-lite': '^1.0.0' } }),
    ).toEqual([]);
  });

  it('says nothing about a manifest with no dependencies at all', () => {
    expect(checkNoUiFramework({})).toEqual([]);
    expect(checkNoUiFramework(null)).toEqual([]);
  });
});

describe('checkNoClientDirectives', () => {
  it('accepts a component that renders at build time', () => {
    expect(checkNoClientDirectives('<Button variant="primary">Prenota</Button>')).toEqual([]);
  });

  it('reports an island', () => {
    const violations = checkNoClientDirectives(
      '<Counter client:visible />',
      'src/pages/index.astro',
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('client:visible');
    expect(violations[0]!.detail).toContain('index.astro');
  });

  it('reports client:only, which the dependency guard cannot see', () => {
    // It is written without the integration being installed, and fails at build
    // time with a message about a missing renderer — the kind of error somebody
    // fixes by installing the renderer.
    expect(checkNoClientDirectives('<Widget client:only="react" />')).toHaveLength(1);
  });
});

describe('checkNoReactRuntime', () => {
  it('accepts a page with no framework in it', () => {
    expect(checkNoReactRuntime('<html lang="it"><body><h1>Ciao</h1></body></html>')).toEqual([]);
  });

  it('reports a runtime that reached the published site', () => {
    const violations = checkNoReactRuntime(
      'var e=React.createElement;',
      'dist/_astro/client.js',
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('createElement');
    expect(violations[0]!.detail).toContain('client.js');
  });

  it('leaves plain DOM alone', () => {
    // `document.createElement` is not a framework, and it is what the scroller
    // of PR 7 will write the first time it ships an inline script. A guard that
    // fired here would go red over code containing nothing of the sort — and
    // CLAUDE.md does not allow switching a test off to get past it, so the only
    // exits would be rewriting correct code or editing this guard.
    expect(checkNoReactRuntime('const el = document.createElement("section");')).toEqual([]);
    expect(checkNoReactRuntime('node.ownerDocument.createElement("div")')).toEqual([]);
  });

  it('leaves a page that merely spells the word alone', () => {
    // Prose, a class name, an Italian word: `reaction`, `preacher`, `reattore`.
    expect(checkNoReactRuntime('<p>La sala reagisce, e il preambolo resta.</p>')).toEqual([]);
  });

  it('reports the design export bundle by name', () => {
    // The one that would mean the specification had been shipped instead of
    // translated — which is rule 8 seen from another side.
    expect(checkNoReactRuntime('window.MinieraDS=MinieraDS')).toHaveLength(1);
  });
});
