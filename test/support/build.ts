/* Vitest globalSetup for the build layer.
 *
 * Runs `astro build` exactly once for the whole suite rather than once per
 * test file. The build takes a few seconds; paying that per file would push
 * people towards not running the tests.
 *
 * Set REUSE_DIST=1 to skip it while iterating locally on a dist/ you know is
 * fresh. CI never sets it: there, the build has to happen.
 *
 * The zone is pinned in the `build` script of package.json, not only here.
 * Pinned here alone it would have held only on the branch that actually builds:
 * `npm run build` by hand in Turin followed by `REUSE_DIST=1 npm test` reads a
 * dist/ built in Italian time, finds «ore 21» for the wrong reason, and the one
 * assertion written to rule that out passes. A test in sources.test.ts keeps
 * the script from losing it again.
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
    // build that has no idea Italy exists. The script pins it too — this is
    // the belt over that brace, and says so where the build is run.
    env: { ...process.env, TZ: 'UTC' },
  });
}
