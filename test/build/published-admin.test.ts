/* What /admin actually serves.
 *
 * The unit layer reads public/admin/config.yml and holds it against the schema;
 * this layer answers the other question — that what an editor's browser gets is
 * that file and that bundle, and not something else with the same name.
 *
 * The bundle is the part with a way of going wrong that nothing else here has.
 * It is copied out of node_modules by `npm run cms:sync` and gitignored, which
 * is the decision written in scripts/sync-cms.mjs: 1.9 MB of somebody else's
 * minified JavaScript has no business in a history that never forgets, and
 * package-lock.json already pins the version. What that trades away is the
 * guarantee a committed file gives — that the bytes served are the bytes
 * reviewed — so it is bought back here, byte for byte, the way the favicon is
 * held to its drawing.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { cmsLicenceTarget, cmsSource } from '../../scripts/sync-cms.mjs';
import { exists, read, readBytes } from '../support/paths.ts';

const PAGE = 'dist/admin/index.html';
const BUNDLE = 'dist/admin/sveltia-cms.js';
const CONFIG = 'dist/admin/config.yml';

describe('/admin', () => {
  it('is published at all', () => {
    // public/ is copied verbatim, so this is really about the folder still
    // being there — and about the three files below having something to be
    // read out of.
    expect(exists(PAGE)).toBe(true);
    expect(exists(CONFIG)).toBe(true);
    expect(exists(BUNDLE)).toBe(true);
  });

  it('asks not to be indexed', () => {
    // The one address of this site that never passes through Base.astro, which
    // is where every other page gets its meta. A CMS in a search result is an
    // invitation to a login form nobody meant to publish.
    const html = read(PAGE);
    expect(/<meta[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)).toBe(true);
  });

  it('loads the bundle from this site and from nowhere else', () => {
    // Not a CDN: the same reason the fonts are self-hosted, plus one that is
    // only true here — that script is handed write access to the repository,
    // so which bytes it is has to be decided by the lockfile and not by what an
    // origin somebody else controls answers on the day.
    const html = read(PAGE);
    const sources = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map(
      (match) => match[1] ?? '',
    );
    expect(sources).toEqual(['/admin/sveltia-cms.js']);
  });

  it('serves the very bundle the lockfile pins', () => {
    // The half of «committed and reviewed» that a generated file gives up, paid
    // back: whatever is under dist/admin is what is installed, or this is red.
    expect(readBytes(BUNDLE).equals(readFileSync(cmsSource))).toBe(true);
  });

  it('carries the licence next to it', () => {
    // MIT asks for the notice to travel with the copy, and a copy served to a
    // browser is a copy. It is the OFL reasoning of src/assets/fonts, applied
    // to the other thing this repository serves without having written.
    expect(exists('dist/admin/LICENSE-sveltia-cms.txt')).toBe(true);
    expect(read('dist/admin/LICENSE-sveltia-cms.txt')).toEqual(readFileSync(cmsLicenceTarget, 'utf8'));
  });

  it('publishes the configuration the guards read, unchanged', () => {
    // Everything the unit layer concludes about public/admin/config.yml is
    // about the file an editor's browser fetches only if the two are the same
    // file. They are copied, so this cannot drift much — but «cannot drift
    // much» is what was said about the favicon.
    expect(read(CONFIG)).toEqual(read('public/admin/config.yml'));
  });

  it('publishes a configuration that parses, with the four collections in it', () => {
    // Read as YAML and not as text: a config that does not parse leaves Sveltia
    // on an error screen, and every other assertion here would still be green.
    const config = parse(read(CONFIG)) as { collections?: { name?: string }[] };
    expect(config.collections?.map((collection) => collection.name)).toEqual([
      'eventi',
      'cicli',
      'sedi',
      'relatori',
    ]);
  });
});
