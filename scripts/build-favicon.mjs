/**
 * Builds public/favicon.ico out of public/favicon.svg.
 *
 * The .svg is what current browsers use; the .ico is for the ones that do not
 * take it, and for the crawlers that ask for /favicon.ico and nothing else.
 * Keeping it generated rather than hand-made is what stops the two from
 * drifting — but only as long as generating it is not a step someone has to
 * remember: `npm run build` runs it, and a build-layer test asserts that the
 * published .ico is what the current drawing produces.
 *
 * sharp writes PNG, not ICO, and an ICO is little more than a header plus a
 * list of images — since Vista it may hold PNG payloads verbatim, which is what
 * this does.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export const faviconSource = join(root, 'public', 'favicon.svg');
export const faviconTarget = join(root, 'public', 'favicon.ico');

/* 32 for the tab and the bookmark bar, 16 for the browsers that still pick the
   smallest one. Beyond those two the .svg has long since taken over. */
const SIZES = [32, 16];

const HEADER = 6;
const ENTRY = 16;

/** The .ico the given drawing produces, as bytes. Writes nothing. */
export async function buildFaviconIco(source = faviconSource) {
  const images = await Promise.all(
    SIZES.map((size) =>
      sharp(source, { density: 384 })
        .resize(size, size, { fit: 'contain' })
        .png({ compressionLevel: 9 })
        .toBuffer()
        .then((data) => ({ size, data })),
    ),
  );

  const header = Buffer.alloc(HEADER);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(images.length, 4);

  let offset = HEADER + ENTRY * images.length;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(ENTRY);
    entry.writeUInt8(size, 0); // width, 0 would mean 256
    entry.writeUInt8(size, 1); // height
    entry.writeUInt8(0, 2); // colours in the palette: none, it is truecolour
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });

  return {
    bytes: Buffer.concat([header, ...entries, ...images.map(({ data }) => data)]),
    sizes: images.map(({ size }) => size),
  };
}

/* Run as a script it writes the file; imported by the test it only returns the
   bytes, so that checking for drift never rewrites what it is checking. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { bytes, sizes } = await buildFaviconIco();
  writeFileSync(faviconTarget, bytes);
  console.log(
    `favicon.ico written with ${sizes.map((size) => `${size}×${size}`).join(' and ')}`,
  );
}
