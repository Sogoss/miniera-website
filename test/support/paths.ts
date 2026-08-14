import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cmsLicenceTarget, cmsTarget } from '../../scripts/sync-cms.mjs';

export const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
export const distDir = join(repoRoot, 'dist');

/* What `npm run cms:sync` puts under public/, taken from the script that puts
   it there rather than written out again here: two names that would drift the
   day the file is renamed, and drift into a guard falling silent. */
const VENDORED = [cmsTarget, cmsLicenceTarget].map((path) => relative(repoRoot, path));

/**
 * A file this repository serves but did not write.
 *
 * The source guards sweep everything the build can ship — that is deliberate,
 * and public/ is in the net because a stylesheet or a phone number dropped
 * there reaches production exactly like one under src/. The compiled Sveltia
 * bundle is in public/ too and is none of those things: 1.9 MB of somebody
 * else's minified JavaScript, copied in by a script, containing `mailto:` and
 * whatever else a CMS contains. Asking it to write its e-mail addresses through
 * src/lib/contact.ts is asking it not to be the CMS, and a guard that fires on
 * correct work is the half somebody switches off.
 *
 * It is the source layer's `copiedFromPublic()`, which the build layer needed
 * first and for the same reason.
 */
export function isVendored(relativePath: string): boolean {
  return VENDORED.includes(relativePath);
}

/** Every file under `dir`, as paths relative to the repository root. */
export function walk(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walk(full));
    else if (entry.isFile()) found.push(relative(repoRoot, full));
  }
  return found;
}

/** Files under `dir` whose name ends with one of `extensions`. */
export function filesWithExtension(dir: string, extensions: string[]): string[] {
  return walk(dir).filter((path) =>
    extensions.some((extension) => path.endsWith(extension)),
  );
}

export function read(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), 'utf8');
}

/** The bytes of a file, for the published artifacts that are not text. */
export function readBytes(relativePath: string): Buffer {
  return readFileSync(join(repoRoot, relativePath));
}

export function readJson(relativePath: string): unknown {
  return JSON.parse(read(relativePath));
}

export function exists(relativePath: string): boolean {
  try {
    statSync(join(repoRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}
