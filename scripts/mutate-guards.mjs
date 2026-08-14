/* Mutation testing over the guards.
 *
 * The rule of this repository is that a guard nobody has seen fire is
 * indistinguishable from a guard that is not looking, which is why every one of
 * them has a negative case. This asks the same question one level up, about the
 * suite instead of the code: is that still true? Each check is **blinded** in
 * turn — made to return no violations whatever it is handed — and the suite is
 * run. A blinding nobody notices means the suite is no longer holding that
 * guard up, however many tests happen to mention it by name.
 *
 * It exists because counting is not enough. Searching the tests for the name of
 * each guard answered «21 of 22» and named the wrong one twice: it counts how
 * the tests are written, not what they hold — a guard called through a local
 * helper appears nowhere in the `it()` that covers it. Blinding *is* the
 * question, so there is nothing left to approximate.
 *
 * **The blinding happens in memory** — scripts/blind.mjs, through a Vite plugin
 * this hands one environment variable. Until PR 15 it edited the file on disk
 * and put it back, which worked and cost: a mark left in blinded files so an
 * interrupted run could be recognised, signal handlers, a restore in a
 * `finally`, and a read-back at the end that refused to finish quietly. All of
 * that was apparatus to make a dangerous method safe, and it forced the runs to
 * happen one at a time — two blindings would have fought over the same file. It
 * is gone: nothing on disk changes, so there is nothing to put back, and the
 * runs go in parallel.
 *
 * What has not changed is what each run does: **the whole suite, per blinding**.
 * Running only the tests that name a guard would be twice as fast and would
 * answer the question this tool was written to refuse.
 *
 * Not part of `npm test`: it is the suite once per check, which is the wrong
 * cost to pay on every save. CI runs it in shards, after the tests, where dist/
 * has just been built and reusing it is free.
 */
import { execFile } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { BLIND_ENV, checksIn } from './blind.mjs';

const execFileAsync = promisify(execFile);
const repoRoot = fileURLToPath(new URL('../', import.meta.url));

export { checksIn };

/* Where the checks live: the guards, and the pure modules of the domain whose
   functions stop a build. Both read from the folder and never from a list
   written by hand — the same reasoning the guards themselves follow, and the
   reason the second pure module arrived already watched.

   Recursively, and that is not tidiness: a flat readdir would stop finding
   test/guards/css/*.ts the day the guards are filed in subfolders, and this
   script would go on printing a tidy «18/18 held up» over eighteen of
   twenty-two. Its own test counts the same checks through a different
   enumeration for the same reason. */
export function sourceFiles(folders = ['test/guards', 'src/lib']) {
  return folders.flatMap((folder) =>
    readdirSync(join(repoRoot, folder), { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? sourceFiles([`${folder}/${entry.name}`])
        : entry.name.endsWith('.ts')
          ? [`${folder}/${entry.name}`]
          : [],
    ),
  );
}

/* Colour codes out of the reading.
 *
 * The first CI run of this script answered «0 of 22, the suite did not run»
 * while the suite was in fact running and failing exactly as it should: the
 * summary it prints is `Tests  9 failed`, and in CI there are colour escapes
 * between the word and the number, so the count was never found. Locally there
 * are none — vitest colours by what it detects around it — so the same command
 * answered one thing on a desk and another on a build machine, which is the
 * shape of defect this repository already knows by another name: the time zone.
 *
 * Hence both halves. NO_COLOR asks for output that needs no cleaning, and this
 * cleans it anyway, because asking depends on who wins between NO_COLOR and
 * FORCE_COLOR in an environment nobody here controls.
 */
const ANSI = /\u001B\[[0-9;]*m/g;
const plain = (text) => text.replace(ANSI, '');

/**
 * How many tests the suite reported red, or null if it never got that far.
 *
 * Its own function, and exported, because it is the part that was wrong: the
 * whole answer of this script rests on reading one line of someone else's
 * output, and that reading now has tests of its own — including the coloured
 * summary that made it say «the suite did not run» twenty-two times.
 */
export function failedCount(output) {
  const failed = /Tests\s+(\d+) failed/.exec(plain(output));
  return failed ? Number(failed[1]) : null;
}

/**
 * The slice of the checks a given shard is responsible for.
 *
 * Round robin rather than a contiguous block: the cost of a blinding is the
 * cost of the suite, so any split balances — but taking every nth means each
 * shard touches every file, and a shard whose whole file has gone missing
 * cannot look complete on its own.
 *
 * Deterministic, pure, and exported, because the promise being made is «between
 * them the shards cover every check exactly once» and that is a property of
 * this function, provable without running anything.
 */
export function shardOf(targets, index, total) {
  if (!Number.isInteger(index) || !Number.isInteger(total) || total < 1 || index < 1 || index > total) {
    throw new Error(`--shard wants \`i/n\` with 1 ≤ i ≤ n, and got \`${index}/${total}\``);
  }
  return targets.filter((_, at) => at % total === index - 1);
}

/** `--shard=2/4 --report=out.json --concurrency=3`, and the modes. */
export function parseArgs(argv) {
  const options = { shard: null, report: null, concurrency: null, workers: null, verify: [] };

  for (const arg of argv) {
    const shard = /^--shard=(\d+)\/(\d+)$/.exec(arg);
    const report = /^--report=(.+)$/.exec(arg);
    const concurrency = /^--concurrency=(\d+)$/.exec(arg);

    if (shard) options.shard = { index: Number(shard[1]), total: Number(shard[2]) };
    else if (report) options.report = report[1];
    else if (concurrency) options.concurrency = Number(concurrency[1]);
    else if (/^--workers=(\d+)$/.test(arg)) options.workers = Number(/^--workers=(\d+)$/.exec(arg)[1]);
    else if (arg === '--verify-reports') options.verifying = true;
    else if (options.verifying) options.verify.push(arg);
    else throw new Error(`unknown argument \`${arg}\``);
  }

  return options;
}

/**
 * What the shards, put back together, cover.
 *
 * The point of sharding is that no single job sees the whole answer any more,
 * and a job that never ran is indistinguishable from one that found nothing to
 * do — which is the «18 of 18» this tool exists not to print, moved up a level
 * into the CI configuration. So the reports are added up against a list of
 * checks derived here, freshly: a name covered twice or not at all is a
 * failure, and so is a total that has drifted.
 */
export function missingFromReports(reports, expected) {
  const covered = new Map();
  for (const report of reports) {
    for (const name of report.checks ?? []) covered.set(name, (covered.get(name) ?? 0) + 1);
  }

  return {
    uncovered: expected.filter((name) => !covered.has(name)),
    twice: [...covered.entries()].filter(([, times]) => times > 1).map(([name]) => name),
    unexpected: [...covered.keys()].filter((name) => !expected.includes(name)),
  };
}

/**
 * What the suite says about a blinded guard.
 *
 * Three answers, not two. A suite that passes means nobody noticed. A suite
 * that fails with a count means the guard is held up, and by how many
 * assertions. A suite that fails *without* a count never got as far as
 * reporting one — a syntax error, a dependency that would not load — and that
 * has to be said, with its reason, rather than counted either way.
 */
async function runSuite({ blind = null, reuseDist = true, workers = null } = {}) {
  const env = { ...process.env, NO_COLOR: '1' };
  // Deleted rather than left alone: the baseline has to build, and REUSE_DIST
  // may well be exported in the shell that started this.
  if (reuseDist) env.REUSE_DIST = '1';
  else delete env.REUSE_DIST;

  if (blind) env[BLIND_ENV] = `${blind.path}::${blind.name}`;
  else delete env[BLIND_ENV];

  try {
    // The installed vitest, run by this node, rather than `npx vitest`: npx
    // resolves a name against a PATH and a registry, and neither is something
    // this needs to depend on sixty-five times in a row.
    const args = [join(repoRoot, 'node_modules/vitest/vitest.mjs'), 'run'];
    /* How many workers *this* suite may use. The blinded runs go several at a
       time, and vitest spreads the forty-odd test files over workers of its
       own: left to itself every run asks for the whole machine, so six runs
       ask for it six times over and spend the difference queueing. What is
       wanted is the product — runs times workers — to be about the core count,
       and the two halves are set together in main(). */
    if (workers) args.push(`--maxWorkers=${workers}`);

    await execFileAsync(process.execPath, args, {
      cwd: repoRoot,
      // Well above what the suite prints. At the 1 MB default an overflow
      // arrives as a failure with the output truncated — which reads exactly
      // like a suite that could not run.
      maxBuffer: 64 * 1024 * 1024,
      env,
    });
    return { noticed: false };
  } catch (error) {
    const output = plain(`${error.stdout ?? ''}${error.stderr ?? ''}`);
    const failed = failedCount(output);
    if (failed !== null) return { noticed: true, failed };

    /* No count means the suite did not get as far as reporting one, and that
       has to arrive with its reason attached. Saying «did not run» and keeping
       the output is the same silence this script exists to break: it happened
       on the first CI run of this very script, and the log said nothing that
       could be acted on. */
    return {
      noticed: false,
      broken: true,
      why: [error.code, error.signal].filter(Boolean).join(' '),
      output,
    };
  }
}

/** The tail of a run that failed to report, for the log of whoever has to fix
 *  it — blank lines dropped, so the useful part fits in a glance. */
function tail(output, lines = 25) {
  const kept = output.split('\n').filter((line) => line.trim());
  return kept
    .slice(-lines)
    .map((line) => `      │ ${line}`)
    .join('\n');
}

/** Runs `work` over `items`, `limit` at a time, in the order they finish. */
async function pool(items, limit, work) {
  const results = [];
  let next = 0;

  const runner = async () => {
    while (next < items.length) {
      const at = next++;
      results[at] = await work(items[at]);
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runner));
  return results;
}

/** Every check in the repository, in a stable order. */
function allTargets() {
  const targets = [];
  for (const path of sourceFiles()) {
    const source = readFileSync(join(repoRoot, path), 'utf8');
    for (const check of checksIn(source)) targets.push({ path, name: check.name });
  }
  return targets;
}

function verifyReports(paths) {
  const expected = allTargets().map((target) => target.name);
  const reports = paths.map((path) => JSON.parse(readFileSync(path, 'utf8')));
  const { uncovered, twice, unexpected } = missingFromReports(reports, expected);

  console.log(
    `[mutate] ${reports.length} shards, ${expected.length} checks in the repository`,
  );

  if (uncovered.length === 0 && twice.length === 0 && unexpected.length === 0) {
    console.log(`\nevery one of the ${expected.length} checks was blinded by exactly one shard`);
    return 0;
  }

  if (uncovered.length) console.error(`Never blinded by any shard: ${uncovered.join(', ')}`);
  if (twice.length) console.error(`Blinded by more than one shard: ${twice.join(', ')}`);
  if (unexpected.length) console.error(`Blinded but no longer in the repository: ${unexpected.join(', ')}`);
  return 1;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.verify.length > 0) {
    process.exitCode = verifyReports(options.verify);
    return;
  }

  const everything = allTargets();

  if (everything.length === 0) {
    // The failure this script exists to make impossible, happening to the
    // script itself: finding nothing and reporting success. Losing *some* of
    // them would be quieter still, and that is what its own test is for.
    console.error('No checks found in test/guards or src/lib. Has the layout changed?');
    process.exit(1);
  }

  const targets = options.shard
    ? shardOf(everything, options.shard.index, options.shard.total)
    : everything;

  /* The suite has to be green before anything is blinded, and this builds to
     make sure of it.
     Without this the whole answer is worthless in the most ordinary situation
     there is: a stale dist/ leaves the build layer red, every blinding then
     looks «noticed», and the script prints a confident «65/65 held up» having
     asked nothing. It is the same failure it accuses the guards of. */
  console.log('[mutate] running the suite once, untouched, to have something to compare against…');
  const baseline = await runSuite({ reuseDist: false });
  if (baseline.noticed || baseline.broken) {
    console.error(
      '\nThe suite is not green before anything was blinded, so nothing said afterwards would mean\n' +
        'anything: every blinding would look noticed. Fix the suite first — `npm test`.',
    );
    if (baseline.output) console.error(tail(baseline.output));
    process.exit(1);
  }

  /* Two cores left alone. The suites underneath spawn workers of their own, so
     the useful number here is well under the core count — measured, not
     assumed: past that the runs start queueing on each other and the wall clock
     stops improving. */
  /* Measured on eight cores rather than assumed. A blinded run on its own is
     3,7s using every worker and 24s using one, so the suite's own parallelism
     is worth four times and handing the pool a single-worker run would be
     paying for parallelism twice. Several runs each holding a couple of workers
     is what came out fastest — nine checks in 24s at six-by-two, against 27s at
     four-by-two and 27s at three-by-three. Two cores are left to the machine. */
  const concurrency = Math.max(1, options.concurrency ?? Math.max(2, cpus().length - 2));
  const workers = options.workers ?? 2;
  const where = options.shard ? ` (shard ${options.shard.index}/${options.shard.total})` : '';
  console.log(
    `[mutate] blinding ${targets.length} of ${everything.length} checks${where}, ` +
      `${concurrency} at a time with ${workers} workers each\n`,
  );

  const survivors = [];
  const broken = [];

  const results = await pool(targets, concurrency, async ({ path, name }) => {
    const result = await runSuite({ blind: { path, name }, workers });

    if (result.noticed) {
      console.log(`  seen     ${name.padEnd(34)} ${result.failed} tests red`);
    } else if (result.broken) {
      console.log(`  UNRUN    ${name.padEnd(34)} the suite never reported ${result.why}`);
      console.log(tail(result.output));
      broken.push(name);
    } else {
      console.log(`  UNSEEN   ${name.padEnd(34)} nothing noticed`);
      survivors.push(name);
    }

    return { name, result };
  });

  if (options.report) {
    writeFileSync(
      options.report,
      `${JSON.stringify(
        {
          shard: options.shard ? `${options.shard.index}/${options.shard.total}` : '1/1',
          checks: results.map(({ name }) => name),
        },
        null,
        2,
      )}\n`,
    );
  }

  const held = targets.length - survivors.length - broken.length;
  console.log(`\n${held}/${targets.length} checks held up by at least one test${where}`);

  if (survivors.length > 0) console.error(`Nothing notices: ${survivors.join(', ')}`);
  if (broken.length > 0) console.error(`Could not be answered for: ${broken.join(', ')}`);

  process.exitCode = survivors.length + broken.length > 0 ? 1 : 0;
}

/* Only when run as a command. Its own test imports the functions above, and
   importing a module that blinds sixty-five guards on the way in would be a
   surprising thing for a test file to do. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
