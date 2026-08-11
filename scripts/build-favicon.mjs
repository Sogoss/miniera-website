/**
 * Builds public/favicon.ico out of public/favicon.svg.
 *
 * The .svg is what current browsers use; the .ico is for the ones that do not
 * take it, and for the crawlers that ask for /favicon.ico and nothing else.
 * Keeping it generated rather than hand-made means the two never drift: change
 * the drawing and run `npm run favicon:build`.
 *
 * sharp writes PNG, not ICO, and an ICO is little more than a header plus a
 * list of images — since Vista it may hold PNG payloads verbatim, which is what
 * this does.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'public', 'favicon.svg');
const target = join(root, 'public', 'favicon.ico');

/* 32 for the tab and the bookmark bar, 16 for the browsers that still pick the
   smallest one. Beyond those two the .svg has long since taken over. */
const SIZES = [32, 16];

const images = await Promise.all(
  SIZES.map((size) =>
    sharp(source, { density: 384 })
      .resize(size, size, { fit: 'contain' })
      .png({ compressionLevel: 9 })
      .toBuffer()
      .then((data) => ({ size, data })),
  ),
);

const HEADER = 6;
const ENTRY = 16;

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

writeFileSync(
  target,
  Buffer.concat([header, ...entries, ...images.map(({ data }) => data)]),
);

console.log(
  `favicon.ico written with ${images.map(({ size }) => `${size}×${size}`).join(' and ')}`,
);
