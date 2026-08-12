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
 * Not part of `npm test`: it runs the whole suite once per check, which is the
 * wrong cost to pay on every save. CI runs it after the tests, where dist/ has
 * just been built and reusing it is free.
 *
 * It edits source files in place and puts them back, and everything about that
 * is made safe here: the originals are held in memory, the restore runs in a
 * `finally` and on a signal, every blinded file carries a mark so an
 * interrupted run is recognisable at the next start, and the last thing this
 * does is read the files back and refuse to end quietly if any of them differs
 * from what it was.
 */
import { execFile } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const repoRoot = fileURLToPath(new URL('../', import.meta.url));

/** Left in a blinded file, so an interrupted run is recognisable next time. */
const MARK = 'blinded by scripts/mutate-guards.mjs';

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

/**
 * Every exported `check…`/`find…` in a file, with the offset its body starts
 * at.
 *
 * The body is the first `{` after the balanced argument list that is followed
 * by a newline: a return type written as an object literal — `): { n: number }`
 * — would otherwise be mistaken for the body, and the injected line would land
 * inside a type.
 *
 * That search is **bounded by the next declaration**, and the bound is the
 * whole point. Unbounded it ran to the end of the file, so a function whose
 * body does not open on a new line silently took the offset of the *next*
 * function's body: that next function got blinded twice and this one, never
 * touched, was reported as held up by a test — a guard with no coverage
 * certified as covered, which is the one answer this script must never give.
 * Bounded, such a function is simply not found, and not-found is loud: the
 * cross-count in its own test compares these names against a second, differently
 * derived list and goes red. An argument list that never closes — an unbalanced
 * `(` inside a comment — drops out the same way, for the same reason.
 */
export function checksIn(source) {
  const found = [];
  const signature = /^export function ((?:check|find)\w+)\s*\(/gm;
  let match;

  while ((match = signature.exec(source)) !== null) {
    let depth = 0;
    let at = source.indexOf('(', match.index);
    for (; at < source.length; at++) {
      if (source[at] === '(') depth++;
      else if (source[at] === ')' && --depth === 0) break;
    }
    if (at >= source.length) continue;

    const next = source.slice(at).search(/\n\s*export function /);
    const window = next === -1 ? source.slice(at) : source.slice(at, at + next);
    const brace = /\{\s*\n/.exec(window);
    if (brace) found.push({ name: match[1], body: at + brace.index + 1 });
  }

  return found;
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
 * What the suite says about a blinded guard.
 *
 * Three answers, not two. A suite that passes means nobody noticed. A suite
 * that fails with a count means the guard is held up, and by how many
 * assertions. A suite that fails *without* a count never got as far as
 * reporting one — a syntax error, a dependency that would not load — and that
 * has to be said, with its reason, rather than counted either way.
 */
async function runSuite({ reuseDist = true } = {}) {
  const env = { ...process.env, NO_COLOR: '1' };
  // Deleted rather than left alone: the baseline has to build, and REUSE_DIST
  // may well be exported in the shell that started this.
  if (reuseDist) env.REUSE_DIST = '1';
  else delete env.REUSE_DIST;

  try {
    // The installed vitest, run by this node, rather than `npx vitest`: npx
    // resolves a name against a PATH and a registry, and neither is something
    // this needs to depend on twenty-two times in a row.
    //
    // Awaited, not execFileSync: a synchronous loop never yields to the event
    // loop, so the signal handlers registered below could not run — and
    // registering them had already replaced Node's default terminate-on-signal,
    // leaving Ctrl-C unable to stop anything at all.
    await execFileAsync(process.execPath, [join(repoRoot, 'node_modules/vitest/vitest.mjs'), 'run'], {
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

async function main() {
  /* The one file blinded right now, and nothing else.
     An earlier version held a snapshot of every file and rewrote them all at
     the end, which silently threw away anything edited while the run was going
     — over a minute during which a developer has no reason to think their
     editor is unsafe. What is put back now is only what this actually
     changed. */
  let inFlight = null;
  const restore = () => {
    if (!inFlight) return;
    writeFileSync(join(repoRoot, inFlight.path), inFlight.text);
    inFlight = null;
  };

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      restore();
      process.exit(130);
    });
  }

  const files = sourceFiles();
  const targets = [];
  for (const path of files) {
    const source = readFileSync(join(repoRoot, path), 'utf8');
    if (source.includes(MARK)) {
      console.error(
        `${path} still carries a blinding from an interrupted run.\n` +
          'Put it back — `git checkout -- .` — before running this again.',
      );
      process.exit(1);
    }
    for (const check of checksIn(source)) targets.push({ path, name: check.name });
  }

  if (targets.length === 0) {
    // The failure this script exists to make impossible, happening to the
    // script itself: finding nothing and reporting success. Losing *some* of
    // them would be quieter still, and that is what its own test is for.
    console.error('No checks found in test/guards or src/lib. Has the layout changed?');
    process.exit(1);
  }

  /* The suite has to be green before anything is blinded, and this builds to
     make sure of it.
     Without this the whole answer is worthless in the most ordinary situation
     there is: a stale dist/ leaves the build layer red, every blinding then
     looks «noticed», and the script prints a confident «22/22 held up» having
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

  console.log(`[mutate] blinding ${targets.length} checks, one at a time\n`);

  const survivors = [];
  const broken = [];

  try {
    for (const { path, name } of targets) {
      /* Read fresh, and the offset worked out here rather than earlier: the
         file may have been edited since the scan, and an offset from a stale
         copy would inject the blinding into the middle of something else. */
      const full = join(repoRoot, path);
      const original = readFileSync(full, 'utf8');
      const check = checksIn(original).find((candidate) => candidate.name === name);
      if (!check) {
        console.log(`  UNRUN    ${name.padEnd(34)} vanished from ${path} since the scan`);
        broken.push(name);
        continue;
      }

      inFlight = { path, text: original };
      writeFileSync(
        full,
        `${original.slice(0, check.body)}\n  return []; // ${MARK}${original.slice(check.body)}`,
      );

      const result = await runSuite();
      restore();

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
    }
  } finally {
    restore();
  }

  /* Read back rather than assumed: this is only allowed to exist because it
     always puts things back, and asking the file system is cheaper than
     trusting it. The mark is what it asks about — comparing against the
     start-of-run text would also flag an edit made meanwhile, which is the
     developer's work and not this script's business. */
  const blinded = files.filter((path) => readFileSync(join(repoRoot, path), 'utf8').includes(MARK));
  if (blinded.length > 0) {
    console.error(`\nNOT RESTORED: ${blinded.join(', ')} — restore by hand.`);
    process.exit(1);
  }

  const held = targets.length - survivors.length - broken.length;
  console.log(`\n${held}/${targets.length} checks held up by at least one test`);

  if (survivors.length > 0) console.error(`Nothing notices: ${survivors.join(', ')}`);
  if (broken.length > 0) console.error(`Could not be answered for: ${broken.join(', ')}`);

  process.exitCode = survivors.length + broken.length > 0 ? 1 : 0;
}

/* Only when run as a command. Its own test imports the functions above, and
   importing a module that blinds twenty-two guards on the way in would be a
   surprising thing for a test file to do. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
