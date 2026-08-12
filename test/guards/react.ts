/* Guards over rule 9: the design system is written in .astro, not as React
 * islands.
 *
 * The eight components are presentational and exactly one had state — the
 * pressed button, which is three lines of CSS. Shipping a framework for that on
 * a static listings site does not pay for itself, and the decision is in
 * docs/decisioni.md.
 *
 * It is a decision that erodes in three separate places, so it is watched in
 * three: a dependency added for one component, a `client:` directive that turns
 * a component into an island, and the runtime itself turning up in dist/. The
 * third is the only one that says what a visitor actually downloads, and it is
 * the one nobody would think to look at.
 */
import { type Violation, lineNumber } from './types.ts';

type Manifest = Record<string, unknown>;

const SECTIONS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];

/* Preact is here too, and on purpose: swapping React for a smaller React is
   the shape this decision comes back in — «it's only 3KB». The argument was
   never the size, it was that eight presentational components do not need a
   runtime at all. */
const FRAMEWORKS = /^(react|react-dom|preact|@astrojs\/(react|preact)|solid-js|@astrojs\/solid-js)$/i;

/** A UI framework among the dependencies. */
export function checkNoUiFramework(manifest: unknown): Violation[] {
  const violations: Violation[] = [];
  const pkg = (manifest ?? {}) as Manifest;

  for (const section of SECTIONS) {
    const block = pkg[section];
    if (!block || typeof block !== 'object') continue;
    for (const name of Object.keys(block as Record<string, unknown>)) {
      if (!FRAMEWORKS.test(name)) continue;
      violations.push({
        rule: 'rule 9',
        detail: `\`${name}\` under ${section}: the design system is written in .astro. The eight components are presentational and the only one with state replicates it with \`:active\``,
      });
    }
  }

  return violations;
}

/**
 * A `client:` directive, which is what turns a component into an island.
 *
 * The dependency guard above would already have fired on the framework — but
 * not on `client:only`, which is written the same way and does not need the
 * integration to be installed to be *written*: it fails at build time with a
 * message about a missing renderer, which is the kind of error somebody fixes
 * by installing the renderer.
 */
export function checkNoClientDirectives(source: string, path = 'the component'): Violation[] {
  const violations: Violation[] = [];
  const pattern = /\sclient:(load|idle|visible|media|only)\b/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source)) !== null) {
    violations.push({
      rule: 'rule 9',
      detail: `\`client:${match[1]}\` on line ${lineNumber(source, match.index)} of ${path} makes this component an island: it ships a framework to the browser to render something the build has already rendered`,
    });
  }

  return violations;
}

/* What a React runtime leaves behind in a bundle. `createElement` and
   `useState` are the two that survive minification as property names on the
   exported object; `MinieraDS` is the export's own namespace, which would mean
   the design system bundle had been shipped rather than translated. */
const RUNTIME_MARKERS = ['createElement', 'useState', 'react-dom', 'MinieraDS'];

/**
 * The runtime itself, in a published file.
 *
 * The only check here that speaks for what a visitor downloads. A framework can
 * arrive without ever being named in package.json — vendored, copied out of the
 * export, pulled in by something else — and this is where that shows up.
 */
export function checkNoReactRuntime(text: string, path = 'the published file'): Violation[] {
  const violations: Violation[] = [];

  for (const marker of RUNTIME_MARKERS) {
    const index = text.indexOf(marker);
    if (index === -1) continue;
    violations.push({
      rule: 'rule 9',
      detail: `\`${marker}\` on line ${lineNumber(text, index)} of ${path}: a UI framework runtime reached the published site. The design system is .astro — nothing of it should need JavaScript in a browser`,
    });
  }

  return violations;
}
