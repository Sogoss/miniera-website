import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
export const distDir = join(repoRoot, 'dist');

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
