/**
 * Copies the Sveltia CMS bundle from node_modules into public/admin.
 *
 * Three ways of getting that file to /admin were possible and two were
 * rejected. A CDN is out for the reason the fonts are self-hosted — the site
 * depends on nobody — and for one more that only applies here: that script is
 * handed write access to the repository, so which bytes it is has to be decided
 * by package-lock.json and not by whatever unpkg answers on the day. Committing
 * it is out because it is 1.9 MB of minified third-party JavaScript, and git
 * does not forget: every upgrade would stay in the history for ever, which is
 * the reasoning docs/contenuti.md already writes about photographs.
 *
 * So it is copied at build time and gitignored, and `@sveltia/cms` sits among
 * the production dependencies rather than the development ones — the build
 * genuinely needs it now, and saying otherwise would be the @fontsource mistake
 * of PR 1 the other way round. What keeps the copy honest is a build-layer test
 * comparing the published bytes with the installed ones, the same way the
 * favicon is kept in step with its drawing.
 *
 * The licence travels with the file, as the OFL makes the fonts do: MIT asks
 * for the notice to go with the copy, and a copy served to a browser is still a
 * copy.
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const packageRoot = join(root, 'node_modules', '@sveltia', 'cms');

/** The bundle as installed: the one the lockfile pins. */
export const cmsSource = join(packageRoot, 'dist', 'sveltia-cms.js');
export const cmsLicenceSource = join(packageRoot, 'LICENSE.txt');

/** Where /admin loads it from. Both are gitignored: the build writes them. */
export const cmsTarget = join(root, 'public', 'admin', 'sveltia-cms.js');
export const cmsLicenceTarget = join(root, 'public', 'admin', 'LICENSE-sveltia-cms.txt');

/**
 * Copies the bundle and its licence, and fails loudly if they are not there.
 *
 * Loudly matters: the alternative to a missing module here is /admin serving a
 * page with a `<script>` that 404s — a CMS that looks like it is loading and
 * never does, on a site whose every other page is fine.
 */
export function syncCms() {
  mkdirSync(dirname(cmsTarget), { recursive: true });
  copyFileSync(cmsSource, cmsTarget);
  copyFileSync(cmsLicenceSource, cmsLicenceTarget);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  syncCms();
  console.log('sveltia-cms.js and its licence copied into public/admin');
}
