/**
 * Ricopia i file dei caratteri dai pacchetti @fontsource a src/assets/fonts.
 *
 * I woff2 stanno nel repo (non in node_modules) perche cosi Vite li versiona
 * con un hash e li serve con cache immutabile, e perche il sito non deve
 * dipendere da un CDN esterno. I pacchetti restano fra le dipendenze di
 * sviluppo solo come provenienza: quando esce una revisione di un carattere,
 * si aggiorna il pacchetto e si rilancia `npm run fonts:sync`.
 *
 * Si copiano solo i sottoinsiemi latin e latin-ext: niente cirillico,
 * niente vietnamita.
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const radice = join(dirname(fileURLToPath(import.meta.url)), '..');
const destinazione = join(radice, 'src', 'assets', 'fonts');

const caratteri = [
  ['@fontsource-variable/archivo', ['archivo-latin-wght-normal.woff2', 'archivo-latin-ext-wght-normal.woff2', 'archivo-latin-wght-italic.woff2', 'archivo-latin-ext-wght-italic.woff2']],
  ['@fontsource/archivo-black', ['archivo-black-latin-400-normal.woff2', 'archivo-black-latin-ext-400-normal.woff2']],
  ['@fontsource/ibm-plex-mono', ['ibm-plex-mono-latin-400-normal.woff2', 'ibm-plex-mono-latin-ext-400-normal.woff2', 'ibm-plex-mono-latin-600-normal.woff2', 'ibm-plex-mono-latin-ext-600-normal.woff2']],
];

const licenze = {
  '@fontsource-variable/archivo': 'LICENSE-archivo.txt',
  '@fontsource/archivo-black': 'LICENSE-archivo-black.txt',
  '@fontsource/ibm-plex-mono': 'LICENSE-ibm-plex-mono.txt',
};

mkdirSync(destinazione, { recursive: true });

let copiati = 0;
for (const [pacchetto, file] of caratteri) {
  const base = join(radice, 'node_modules', ...pacchetto.split('/'));
  for (const nome of file) {
    copyFileSync(join(base, 'files', nome), join(destinazione, nome));
    copiati++;
  }
  // La OFL richiede che la licenza accompagni i file: va tenuta accanto a loro.
  copyFileSync(join(base, 'LICENSE'), join(destinazione, licenze[pacchetto]));
}

console.log(`${copiati} file di caratteri e 3 licenze copiati in src/assets/fonts`);
