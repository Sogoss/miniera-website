// @ts-check
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import { hashSource, headersFile, inlineScripts } from './src/lib/headers.ts';

/** Every file under a directory, deepest first or not — order does not matter.
 *
 * @param {string} dir
 * @returns {string[]}
 */
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

/** What a browser hashes: the bytes between the tags, as they were sent.
 *
 * @param {string} source
 * @returns {string}
 */
function sha256(source) {
  return createHash('sha256').update(source, 'utf8').digest('base64');
}

/**
 * Writes dist/_headers once the pages exist.
 *
 * It has to be here and not in public/ because the Content-Security-Policy
 * contains the hash of every inline script and style the build produced, and
 * those are known only afterwards — see src/lib/headers.ts for why hashes and
 * not `'unsafe-inline'`, and why they are taken from dist/ rather than from the
 * source.
 *
 * dist/admin/ is left out of the collection: the editing desk is not a page of
 * this site, it has its own row in the file, and hashing Sveltia's shell into
 * the site's policy would be widening the site to fit the CMS.
 *
 * @returns {import('astro').AstroIntegration}
 */
function headers() {
  return {
    name: 'headers-file',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const scripts = new Set();

        const pages = walk(root).filter(
          (path) => path.endsWith('.html') && !path.startsWith(join(root, 'admin')),
        );

        for (const page of pages) {
          const html = readFileSync(page, 'utf8');
          for (const body of inlineScripts(html)) scripts.add(hashSource(sha256(body)));
        }

        /* Sorted so that two builds of the same site produce the same file:
           an unstable order would show up as a diff in every deployment and
           make a real change to the policy impossible to see. */
        const file = headersFile([...scripts].sort());
        writeFileSync(join(root, '_headers'), file, 'utf8');

        logger.info(`_headers: ${scripts.size} script hash(es) over ${pages.length} page(s)`);
      },
    },
  };
}

// https://astro.build/config
export default defineConfig({
  integrations: [headers()],

  // The domain has not been bought yet (decided: we come back to it once the
  // site is finished). When it exists it goes here: it feeds the canonical
  // URLs, the sitemap and the Open Graph meta of the event pages, which are
  // the whole reason the /81 URLs exist.
  // site: 'https://www.laminieraculturale.it',

  // No Tailwind: the design system is already a token system in plain CSS
  // (src/styles/tokens). Adding Tailwind would mean maintaining a translation
  // between two vocabularies that say the same thing, for ever.

  vite: {
    server: {
      // Vite answers «Blocked request. This host is not allowed» to anything
      // that reaches it under a hostname it does not know — which is every
      // tunnel. These are the domains a tunnel hands out, so that a phone can
      // open the development server without the site being published: the
      // checks on a real telephone are the ones this project cannot do any
      // other way. It has no effect on a build.
      allowedHosts: ['.ngrok-free.app', '.ngrok.app', '.ngrok.io', '.trycloudflare.com'],
    },

    build: {
      // The browser floor of docs/vincoli-tecnici.md, told to the minifier.
      //
      // Left to itself it rewrites `@media (max-width: 900px)` as
      // `@media (width <= 900px)` — the range syntax, which is Safari 16.4 and
      // later. Every media query of the scroller would then be ignored on iOS
      // 15.4 to 16.3: the phone gets the desktop layout, with two columns on a
      // 390px screen, and nothing anywhere says so. It is the collapsed
      // fallback again, in another disguise — the source is right and the
      // published file is not.
      //
      // 15.4 because that is where `svh` arrives, which is the constraint that
      // sets the floor in the first place.
      cssTarget: ['safari15.4', 'chrome100', 'firefox100', 'edge100'],
      target: ['safari15.4', 'chrome100', 'firefox100', 'edge100'],
    },
  },
});
