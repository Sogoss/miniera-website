import { describe, expect, it } from 'vitest';
import { buildFaviconIco } from '../../scripts/build-favicon.mjs';
import { checkDesignRuntimeArtifacts } from '../guards/artifacts.ts';
import { checkItalianDataAttributes } from '../guards/language.ts';
import { checkNoReactRuntime } from '../guards/react.ts';
import { copiedFromPublic, listPublishedFiles, readPublishedFiles } from '../support/dist.ts';
import { readBytes } from '../support/paths.ts';

describe('what the build publishes', () => {
  it('produced a home page', () => {
    expect(listPublishedFiles()).toContain('dist/index.html');
  });

  it('carries nothing from the Claude Design runtime', () => {
    const files = readPublishedFiles();
    expect(files.length).toBeGreaterThan(0);

    const violations = files.flatMap(({ path, text }) =>
      checkDesignRuntimeArtifacts(text, path),
    );
    expect(violations.map((v) => v.detail)).toEqual([]);
  });

  it('ships no UI framework to the browser', () => {
    // Rule 9, asked of what a visitor downloads. The dependency guard watches
    // package.json and the directive guard watches the source; a runtime can
    // reach dist/ without either — vendored, copied out of the export, dragged
    // in by something else — and the eight components need no JavaScript at
    // all, so anything of the sort is a decision reversed in silence.
    //
    // Files copied out of public/ are left out, the way publishedPages() leaves
    // them out of the document guards: PR 13 puts the compiled Sveltia bundle
    // at public/admin/, and asking that not to be a framework is asking it not
    // to be the CMS.
    const files = readPublishedFiles().filter(({ path }) => !copiedFromPublic(path));
    expect(files.length).toBeGreaterThan(0);

    const violations = files.flatMap(({ path, text }) => checkNoReactRuntime(text, path));
    expect(violations.map((v) => v.detail)).toEqual([]);
  });

  it('names every data-* attribute in English', () => {
    // The markup half of the token rename. The published HTML is where an
    // attribute written as an expression — `data-cycle={n}` — finally becomes
    // visible, so this layer catches what the source one cannot read.
    const pages = readPublishedFiles().filter(({ path }) => path.endsWith('.html'));
    expect(pages.length).toBeGreaterThan(0);

    const violations = pages.flatMap(({ path, text }) =>
      checkItalianDataAttributes(text, path),
    );
    expect(violations.map((v) => v.detail)).toEqual([]);
  });

  it('publishes a favicon.ico that is still the current drawing', async () => {
    // Two committed artifacts, one drawn by hand and one generated from it:
    // what keeps them together is that `npm run build` runs the generator, and
    // this is the assertion that says so. Change favicon.svg, forget the rest,
    // and the suite fails here instead of the site serving the superseded icon
    // to every crawler that asks for /favicon.ico and nothing else.
    //
    // Comparing bytes is safe precisely because the build regenerates: both
    // sides come from the same sharp on the same machine. Against a
    // hand-committed .ico it would have been a guard that fires on correct
    // work the first time someone builds on another platform.
    const { bytes } = await buildFaviconIco();
    expect(readBytes('dist/favicon.ico').equals(bytes)).toBe(true);
  });
});
