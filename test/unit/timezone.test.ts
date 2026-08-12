/* The same answers under two clocks, proved by running under both.
 *
 * The guard next door forbids the shapes that would break this; this is the
 * proof that nothing else does. Vitest cannot give it: TZ is read once when
 * the process starts, so a single run can only ever test the machine it is on
 * — which in CI is UTC and on a desk in Turin is not, and that difference is
 * exactly the one that has to be invisible.
 *
 * Hence two child processes. `src/lib/events.ts` imports nothing precisely so
 * that `node` can run it with no bundler and no Astro in the way.
 */
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../support/paths.ts';

function printedUnder(timeZone: string): unknown {
  const output = execFileSync(
    process.execPath,
    [join(repoRoot, 'test/support/print-dates.ts')],
    { cwd: repoRoot, env: { ...process.env, TZ: timeZone }, encoding: 'utf8' },
  );
  return JSON.parse(output);
}

/** What Turin says, whoever is asking. */
const EXPECTED = {
  romeDay: '2026-09-24',
  shortDate: '24 set 26',
  longDate: 'gio 24 set 26, ore 21',
  pastJustBefore: false,
  pastAtMidnight: true,
};

describe('the domain under two time zones', () => {
  it('answers the same under TZ=UTC and TZ=Europe/Rome', { timeout: 30_000 }, () => {
    const utc = printedUnder('UTC');
    const rome = printedUnder('Europe/Rome');

    // Both halves matter. Equality alone would pass on two answers that are
    // wrong in the same way; the expectation alone would pass on the machine
    // that happens to agree with it.
    expect(utc).toEqual(rome);
    expect(utc).toEqual(EXPECTED);
  });
});
