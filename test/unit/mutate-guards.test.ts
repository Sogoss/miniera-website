/* The scanner inside scripts/mutate-guards.mjs.
 *
 * The script answers «is every guard still held up by a test» by blinding each
 * one and watching the suite. It has one quiet way to be wrong, and it is the
 * same one it exists to catch: finding fewer checks than there are. Finding
 * none it says so and stops — but finding eighteen of twenty-two it would
 * report «18/18 held up», which reads exactly like an answer.
 *
 * So the count is checked here against a second, independent count, and the
 * shapes it has to survive are pinned. Running the script itself takes a minute
 * and belongs to CI; this takes milliseconds and belongs to every save.
 */
import { describe, expect, it } from 'vitest';
import {
  failedCount,
  missingFromReports,
  parseArgs,
  shardOf,
  sourceFiles,
} from '../../scripts/mutate-guards.mjs';
import { BLIND_ENV, blindPlugin, blindSource, checksIn } from '../../scripts/blind.mjs';
import { filesWithExtension, read, repoRoot } from '../support/paths.ts';
import { join } from 'node:path';

describe('checksIn', () => {
  it('finds an exported guard and the start of its body', () => {
    const source = 'export function checkThing(css: string): Violation[] {\n  return [];\n}\n';
    const [found] = checksIn(source);
    expect(found?.name).toBe('checkThing');
    // The offset is the character after the `{` of the body, which is where the
    // blinding is injected.
    expect(source.slice(found!.body)).toBe('\n  return [];\n}\n');
  });

  it('finds one whose arguments span several lines', () => {
    const source = [
      'export function checkDateHasOffset(',
      '  data: Record<string, unknown>,',
      '  path: string,',
      '): Violation[] {',
      '  return [];',
      '}',
    ].join('\n');
    expect(checksIn(source).map((check) => check.name)).toEqual(['checkDateHasOffset']);
  });

  it('finds every check in a file, not just the first', () => {
    const source =
      'export function checkOne(a: string) {\n  return [];\n}\n\n' +
      'export function findTwo(b: string) {\n  return [];\n}\n';
    expect(checksIn(source).map((check) => check.name)).toEqual(['checkOne', 'findTwo']);
  });

  it('leaves alone what is not an exported check', () => {
    // A helper, a type, and an exported function that is neither check nor
    // find: blinding those would say nothing about the guards.
    const source =
      'function checkPrivate(a: string) {\n  return [];\n}\n' +
      'export function stripComments(css: string) {\n  return css;\n}\n' +
      'export type Violation = { rule: string };\n';
    expect(checksIn(source)).toEqual([]);
  });

  it('does not mistake an object return type for the body', () => {
    // `): { … }` before the real brace. Injecting there would land inside a
    // type, the suite would fail to compile, and a guard nothing holds up would
    // be reported as held up — the wrong direction to be wrong in.
    const source = 'export function checkThing(a: string): { n: number } {\n  return [];\n}\n';
    const [found] = checksIn(source);
    expect(source.slice(found!.body)).toBe('\n  return [];\n}\n');
  });

  it('gives two consecutive checks two different bodies', () => {
    // The offsets, not just the names. Handing both the same offset would blind
    // one function twice and report the other — never touched — as held up by a
    // test, which is the one answer the script must never give.
    const source =
      'export function checkOne(a: string) {\n  return [];\n}\n\n' +
      'export function checkTwo(b: string) {\n  return [];\n}\n';
    const [one, two] = checksIn(source);
    expect(one!.body).not.toBe(two!.body);
    expect(source.slice(one!.body)).toContain('export function checkTwo');
    expect(source.slice(two!.body)).not.toContain('export function');
  });

  it('does not reach into the next function for a body it cannot find', () => {
    // A one-line body. The search used to run to the end of the file and take
    // the *next* function's offset; now it stops at the next declaration and
    // this one is simply not found — which the cross-count below turns red.
    const source =
      'export function checkCompact(a: string) { return []; }\n\n' +
      'export function checkNormal(b: string) {\n  return [];\n}\n';
    expect(checksIn(source).map((check) => check.name)).toEqual(['checkNormal']);
  });

  it('drops a check whose argument list never closes, rather than guessing', () => {
    // An unbalanced `(` in a comment inside the parameters. Dropping it is
    // safe only because dropping it is loud: the cross-count says a name is
    // missing.
    const source =
      'export function checkOdd(\n  // the fallback ( see rule 4\n  a: string,\n) {\n  return [];\n}\n';
    expect(checksIn(source)).toEqual([]);
  });
});

/* Reading the one line of vitest output the whole answer rests on.
 *
 * This is where the script was wrong, and it was wrong in the way that is
 * hardest to catch from a desk: the summary is `Tests  9 failed` here and the
 * same line painted in colour escapes on a build machine, so the count was
 * found locally and never in CI — where the script duly reported that the suite
 * had not run, twenty-two times, over a suite that was running and failing
 * exactly as it should. The same shape as the time zone, and it gets the same
 * treatment: the environment is asked not to colour, and the reading copes
 * whether or not it listened.
 */
describe('failedCount', () => {
  const esc = String.fromCharCode(27);

  it('reads a plain summary', () => {
    expect(failedCount('  Tests  9 failed | 343 passed (352)')).toBe(9);
  });

  it('reads the same summary painted in colour', () => {
    const coloured = `  ${esc}[2mTests${esc}[22m  ${esc}[1m${esc}[31m9 failed${esc}[39m${esc}[22m | 343 passed`;
    expect(failedCount(coloured)).toBe(9);
  });

  it('answers null when the suite never got to a summary', () => {
    // Not zero: «nothing reported» and «nothing failed» are opposite answers
    // about a blinded guard, and telling them apart is the point.
    expect(failedCount('Error: Cannot find module vitest')).toBeNull();
    expect(failedCount('')).toBeNull();
  });

  it('does not read a passing run as a failing one', () => {
    expect(failedCount('  Tests  352 passed (352)')).toBeNull();
  });
});

/* The cross-count, and why it is built out of different parts.
 *
 * A count that shares the scanner's regex, or the scanner's file list, agrees
 * with it about what does not exist — which is the one thing it was added to
 * disagree about. Both halves are therefore arrived at another way: the files
 * through `filesWithExtension`, which walks subfolders, and the names through a
 * pattern that also admits the declaration shapes the scanner does not read.
 * The day a guard is written as `export const checkX = (…) =>` or filed under
 * test/guards/css/, this goes red instead of the script printing a tidy
 * «n/n held up» over a shorter list.
 */
describe('the checks the script will find in this repository', () => {
  const files = sourceFiles();

  const walked = [
    ...filesWithExtension(join(repoRoot, 'test/guards'), ['.ts']),
    ...filesWithExtension(join(repoRoot, 'src/lib'), ['.ts']),
  ];

  /** Every exported name a guard could plausibly be declared under. */
  const declared = walked.flatMap((path) =>
    [
      ...read(path).matchAll(
        /^export (?:async function|function|const|let) ((?:check|find)\w+)/gm,
      ),
    ].map((match) => match[1]!),
  );

  it('reads both folders where a check can live', () => {
    expect(files.some((path: string) => path.startsWith('test/guards/'))).toBe(true);
    expect(files.some((path: string) => path.startsWith('src/lib/'))).toBe(true);
  });

  it('sees the same files a recursive walk sees', () => {
    // Its own enumeration is a readdir; this one walks. A guard filed one
    // folder deeper would drop out of the script and out of the cross-count
    // below together, and both would stay green.
    expect([...files].sort()).toEqual([...walked].sort());
  });

  it('finds every one of them', () => {
    // The assertion that matters: two counts, arrived at differently. A
    // scanner that quietly stopped finding some would still print a tidy
    // «n/n held up».
    const found = files.flatMap((path: string) =>
      checksIn(read(path)).map((check: { name: string }) => check.name),
    );
    expect(found.sort()).toEqual(declared.sort());
    expect(found.length).toBeGreaterThan(20);
  });

  it('names files that can actually be read', () => {
    // The paths it hands out are the paths it will write back to, so a wrong
    // one is not a missing answer but a file restored to the wrong place.
    for (const path of files) expect(() => read(path)).not.toThrow();
  });
});

/* Blinding in memory, which is how it is done from PR 15 on.
 *
 * The property that matters is not «the text was changed» but «that function
 * now returns nothing»: the whole answer of the tool rests on it, and until
 * this PR it rested on a file being rewritten, which is a thing one can see. In
 * memory it is not, so it is executed here — the blinded source is imported and
 * called.
 */
describe('blindSource', () => {
  it('makes the check return nothing, whatever it is handed', async () => {
    const source = 'export function checkThing(x) {\n  return [{ rule: "r", detail: x }];\n}\n';
    const blinded = blindSource(source, 'checkThing');
    expect(blinded).not.toBeNull();

    const loaded = await import(`data:text/javascript,${encodeURIComponent(blinded!)}`);
    expect(loaded.checkThing('anything at all')).toEqual([]);

    // And the original body is still there, after the injected line: what is
    // being tested is that the return comes first, not that the code was
    // deleted.
    expect(blinded).toContain('return [{ rule: "r", detail: x }]');
  });

  it('leaves the other checks in the file alone', async () => {
    const source =
      'export function checkOne(x) {\n  return ["one"];\n}\n' +
      'export function checkTwo(x) {\n  return ["two"];\n}\n';
    const loaded = await import(
      `data:text/javascript,${encodeURIComponent(blindSource(source, 'checkOne')!)}`
    );
    expect(loaded.checkOne('x')).toEqual([]);
    expect(loaded.checkTwo('x')).toEqual(['two']);
  });

  it('answers null for a check that is not in the file', () => {
    // Not «the text unchanged»: the caller has to tell «this is now blind» from
    // «there was nothing to blind», or it runs the suite against an untouched
    // file and calls the check watched.
    expect(blindSource('export function checkOne(x) {\n  return [];\n}\n', 'checkTwo')).toBeNull();
  });
});

describe('blindPlugin', () => {
  const file = 'test/guards/example.ts';
  const source = 'export function checkThing(x: string): string[] {\n  return [x];\n}\n';

  it('is not there at all when nothing is being blinded', () => {
    // The everyday `npm test` must not carry it: a plugin that is present and
    // inert is one env var away from being present and wrong.
    expect(blindPlugin({})).toBeNull();
  });

  it('blinds the file it names', () => {
    const plugin = blindPlugin({ [BLIND_ENV]: `${file}::checkThing` })!;
    const transformed = plugin.transform(source, `/repo/${file}`);
    expect(transformed).toContain('return [];');
  });

  it('leaves every other module alone', () => {
    const plugin = blindPlugin({ [BLIND_ENV]: `${file}::checkThing` })!;
    expect(plugin.transform(source, '/repo/test/guards/other.ts')).toBeNull();
  });

  it('recognises the file through the query Vite appends', () => {
    // Ids arrive as `…/example.ts?v=8a1c`. Comparing the whole string would
    // silently blind nothing, and «nothing blinded» reads as «held up by a
    // test».
    const plugin = blindPlugin({ [BLIND_ENV]: `${file}::checkThing` })!;
    expect(plugin.transform(source, `/repo/${file}?v=8a1c`)).toContain('return [];');
  });

  it('throws when the check it was asked for is not there', () => {
    const plugin = blindPlugin({ [BLIND_ENV]: `${file}::checkVanished` })!;
    expect(() => plugin.transform(source, `/repo/${file}`)).toThrow(/does not export it/);
  });

  it('refuses an environment variable it cannot read', () => {
    expect(() => blindPlugin({ [BLIND_ENV]: 'test/guards/example.ts' })).toThrow(/path::checkName/);
  });
});

/* Sharding, and the promise it has to keep.
 *
 * Splitting the run across CI jobs means no single job sees the whole answer,
 * so «every check was blinded» stops being something one job can say. These two
 * are what replaces it: the split covers everything exactly once, and the
 * reports add back up to the list.
 */
describe('shardOf', () => {
  const targets = Array.from({ length: 65 }, (_, at) => ({ name: `check${at}` }));

  it.each([1, 2, 3, 4, 7])('covers every check exactly once across %i shards', (total) => {
    const covered = Array.from({ length: total }, (_, at) => shardOf(targets, at + 1, total)).flat();
    expect(covered).toHaveLength(targets.length);
    expect(new Set(covered.map((target) => target.name)).size).toBe(targets.length);
  });

  it('gives no shard the whole list', () => {
    // A split that quietly handed every shard everything would pass the check
    // above and cost four times the machine.
    expect(shardOf(targets, 1, 4).length).toBeLessThan(targets.length);
  });

  it('refuses a shard that is not one of n', () => {
    expect(() => shardOf(targets, 0, 4)).toThrow(/1 ≤ i ≤ n/);
    expect(() => shardOf(targets, 5, 4)).toThrow(/1 ≤ i ≤ n/);
  });
});

describe('missingFromReports', () => {
  it('says nothing when the shards add up', () => {
    const found = missingFromReports([{ checks: ['a', 'c'] }, { checks: ['b'] }], ['a', 'b', 'c']);
    expect(found).toEqual({ uncovered: [], twice: [], unexpected: [] });
  });

  it('names a check no shard blinded', () => {
    // The shape this exists for: a job that never ran looks exactly like a job
    // with nothing to do, and «65 of 65» would be printed over 48.
    expect(missingFromReports([{ checks: ['a'] }], ['a', 'b']).uncovered).toEqual(['b']);
  });

  it('names a check two shards both blinded', () => {
    expect(missingFromReports([{ checks: ['a'] }, { checks: ['a'] }], ['a']).twice).toEqual(['a']);
  });

  it('names a check that is in a report and no longer in the repository', () => {
    expect(missingFromReports([{ checks: ['gone'] }], ['a']).unexpected).toEqual(['gone']);
  });

  it('treats a report with no checks at all as covering nothing', () => {
    expect(missingFromReports([{}], ['a']).uncovered).toEqual(['a']);
  });
});

describe('parseArgs', () => {
  it('reads the shard, the report, the pool and the workers', () => {
    expect(parseArgs(['--shard=2/4', '--report=out.json', '--concurrency=6', '--workers=2'])).toEqual({
      shard: { index: 2, total: 4 },
      report: 'out.json',
      concurrency: 6,
      workers: 2,
      verify: [],
    });
  });

  it('collects the reports to add up', () => {
    expect(parseArgs(['--verify-reports', 'a.json', 'b.json']).verify).toEqual(['a.json', 'b.json']);
  });

  it('refuses an argument it does not know instead of ignoring it', () => {
    // `--shard 2/4` written with a space, or a typo in `--concurrency`: ignored,
    // the run would blind everything and look like it had sharded.
    expect(() => parseArgs(['--shards=2/4'])).toThrow(/unknown argument/);
  });
});

/* The number of checks, which was written in prose in four places and drifted.
 *
 * PR 17 added seven and the documentation went on saying sixty-five — in
 * CLAUDE.md, in the CI comment, and in the plan. None of it fails: a count in a
 * sentence is read by people and by nothing else, and the sentence that is
 * wrong is the one telling a newcomer how big this thing is.
 *
 * So it is stated **once**, in CLAUDE.md, and this holds that statement against
 * the enumeration the tool itself uses. The other places now say «once per
 * check» and name no number. The two mentions inside the PR 15 section of the
 * plan are left alone on purpose: they are a measurement of what was true then,
 * and correcting them would be falsifying a record rather than fixing a fact.
 */
describe('the number of checks CLAUDE.md states', () => {
  const STATED = /le guardie sono (\d+)/;

  it('is the number there actually are', () => {
    const claude = read('CLAUDE.md');
    const match = STATED.exec(claude);

    expect(
      match,
      'CLAUDE.md no longer says «le guardie sono N». Either put the sentence back or delete this test with a reason — a count nothing checks is the one that drifted',
    ).not.toBeNull();

    const counted = (sourceFiles() as string[]).reduce(
      (total: number, path: string) => total + checksIn(read(path)).length,
      0,
    );

    expect(
      Number(match![1]),
      `CLAUDE.md says ${match![1]} checks and there are ${counted}. The number is stated in one place so that this can hold it: update the sentence`,
    ).toBe(counted);
  });
});
