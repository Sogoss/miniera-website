/**
 * Copies the font files from the @fontsource packages into src/assets/fonts.
 *
 * The woff2 files live in the repository (not in node_modules) because that
 * way Vite fingerprints them with a hash and serves them with an immutable
 * cache, and because the site must not depend on an external CDN. The packages
 * stay among the development dependencies purely as provenance: when a font
 * gets a new revision, update the package and run `npm run fonts:sync` again.
 *
 * Only the latin and latin-ext subsets are copied: no Cyrillic, no Vietnamese.
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const destination = join(root, 'src', 'assets', 'fonts');

const fonts = [
  ['@fontsource-variable/archivo', ['archivo-latin-wght-normal.woff2', 'archivo-latin-ext-wght-normal.woff2', 'archivo-latin-wght-italic.woff2', 'archivo-latin-ext-wght-italic.woff2']],
  ['@fontsource/archivo-black', ['archivo-black-latin-400-normal.woff2', 'archivo-black-latin-ext-400-normal.woff2']],
  ['@fontsource/ibm-plex-mono', ['ibm-plex-mono-latin-400-normal.woff2', 'ibm-plex-mono-latin-ext-400-normal.woff2', 'ibm-plex-mono-latin-600-normal.woff2', 'ibm-plex-mono-latin-ext-600-normal.woff2']],
];

const licences = {
  '@fontsource-variable/archivo': 'LICENSE-archivo.txt',
  '@fontsource/archivo-black': 'LICENSE-archivo-black.txt',
  '@fontsource/ibm-plex-mono': 'LICENSE-ibm-plex-mono.txt',
};

mkdirSync(destination, { recursive: true });

let copied = 0;
for (const [pkg, files] of fonts) {
  const base = join(root, 'node_modules', ...pkg.split('/'));
  for (const name of files) {
    copyFileSync(join(base, 'files', name), join(destination, name));
    copied++;
  }
  // The OFL requires the licence to travel with the files: it belongs next to
  // them.
  copyFileSync(join(base, 'LICENSE'), join(destination, licences[pkg]));
}

console.log(`${copied} font files and 3 licences copied into src/assets/fonts`);
