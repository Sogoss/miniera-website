/* Vitest globalSetup for the build layer.
 *
 * Runs `astro build` exactly once for the whole suite rather than once per
 * test file. The build takes a few seconds; paying that per file would push
 * people towards not running the tests.
 *
 * Set REUSE_DIST=1 to skip it while iterating locally on a dist/ you know is
 * fresh. CI never sets it: there, the build has to happen.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { distDir, repoRoot } from './paths.ts';

export default function setup(): void {
  if (process.env.REUSE_DIST === '1' && existsSync(distDir)) {
    console.log('[build] REUSE_DIST=1, reusing the existing dist/');
    return;
  }

  console.log('[build] running `npm run build` for the build-layer tests…');
  execFileSync('npm', ['run', 'build'], {
    cwd: repoRoot,
    stdio: 'inherit',
    // TZ=UTC on purpose, everywhere, including a laptop in Turin: it is the
    // zone Cloudflare builds in, and the dates published from a machine in
    // Italy would agree with Europe/Rome for the wrong reason. The assertions
    // in test/build/published-dates.test.ts expect Italian time out of a
    // build that has no idea Italy exists.
    env: { ...process.env, TZ: 'UTC' },
  });
}
