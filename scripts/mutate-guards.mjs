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
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const distDir = join(repoRoot, 'dist');

/** Left in a blinded file, so an interrupted run is recognisable next time. */
const MARK = 'blinded by scripts/mutate-guards.mjs';

/* Where the checks live: the guards, and the pure modules of the domain whose
   functions stop a build. Both read from the folder and never from a list
   written by hand — the same reasoning the guards themselves follow, and the
   reason the second pure module arrived already watched. */
export function sourceFiles() {
  return ['test/guards', 'src/lib'].flatMap((folder) =>
    readdirSync(join(repoRoot, folder))
      .filter((name) => name.endsWith('.ts'))
      .map((name) => `${folder}/${name}`),
  );
}

/**
 * Every exported `check…`/`find…` in a file, with the offset its body starts
 * at.
 *
 * The body is the first `{` after the balanced argument list that is followed
 * by a newline: a return type written as an object literal — `): { n: number }`
 * — would otherwise be mistaken for the body, and the injected line would land
 * inside a type. Every function in the repository opens its body on a line of
 * its own, and one that did not would simply not be found, which is the safe
 * direction to be wrong in.
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

    const brace = /\{\s*\n/.exec(source.slice(at));
    if (brace) found.push({ name: match[1], body: at + brace.index + 1 });
  }

  return found;
}

/**
 * What the suite says about a blinded guard.
 *
 * Three answers, not two. A suite that passes means nobody noticed. A suite
 * that fails with a count means the guard is held up, and by how many
 * assertions. A suite that fails *without* a count did not run at all — a
 * syntax error, a missing dependency — and that has to be said rather than
 * counted as a catch: it is the same failure as a guard passing for the wrong
 * reason.
 */
function runSuite() {
  try {
    // The installed vitest, run by this node, rather than `npx vitest`: npx
    // resolves a name against a PATH and a registry, and neither is something
    // this needs to depend on twenty-two times in a row.
    execFileSync(process.execPath, [join(repoRoot, 'node_modules/vitest/vitest.mjs'), 'run'], {
      cwd: repoRoot,
      stdio: 'pipe',
      // Well above what the suite prints. At the 1 MB default an overflow
      // arrives as a failure with the output truncated — which reads exactly
      // like a suite that could not run.
      maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, REUSE_DIST: '1' },
    });
    return { noticed: false };
  } catch (error) {
    const output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
    const failed = /Tests\s+(\d+) failed/.exec(output);
    if (failed) return { noticed: true, failed: Number(failed[1]) };

    /* No count means the suite did not get as far as reporting one, and that
       has to arrive with its reason attached. Saying «did not run» and keeping
       the output is the same silence this script exists to break: it happened
       on the first CI run of this very script, and the log said nothing that
       could be acted on. */
    return {
      noticed: false,
      broken: true,
      why: `${error.code ?? ''} ${error.status === undefined ? '' : `exit ${error.status}`}`.trim(),
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

function main() {
  const originals = new Map();
  const restore = () => {
    for (const [path, text] of originals) writeFileSync(join(repoRoot, path), text);
  };

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      restore();
      process.exit(130);
    });
  }

  const targets = [];
  for (const path of sourceFiles()) {
    const source = readFileSync(join(repoRoot, path), 'utf8');
    if (source.includes(MARK)) {
      console.error(
        `${path} still carries a blinding from an interrupted run.\n` +
          'Put it back — `git checkout -- .` — before running this again.',
      );
      process.exit(1);
    }
    originals.set(path, source);
    for (const check of checksIn(source)) targets.push({ path, ...check });
  }

  if (targets.length === 0) {
    // The failure this script exists to make impossible, happening to the
    // script itself: finding nothing and reporting success. Losing *some* of
    // them would be quieter still, and that is what its own test is for.
    console.error('No checks found in test/guards or src/lib. Has the layout changed?');
    process.exit(1);
  }

  if (!existsSync(distDir)) {
    // Built once, before anything is blinded: left to the first run, the site
    // would be built with a guard already blinded.
    console.log('[mutate] no dist/ yet — building once before starting…');
    execFileSync('npm', ['run', 'build'], { cwd: repoRoot, stdio: 'inherit' });
  }

  console.log(`[mutate] blinding ${targets.length} checks, one at a time\n`);

  const survivors = [];
  const broken = [];

  try {
    for (const { path, name, body } of targets) {
      const original = originals.get(path);
      writeFileSync(
        join(repoRoot, path),
        `${original.slice(0, body)}\n  return []; // ${MARK}${original.slice(body)}`,
      );

      const result = runSuite();
      writeFileSync(join(repoRoot, path), original);

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

  /* The files are read back rather than assumed: this is only allowed to exist
     because it always puts them back, and asking the file system is cheaper
     than trusting it. */
  const changed = [...originals].filter(
    ([path, text]) => readFileSync(join(repoRoot, path), 'utf8') !== text,
  );
  if (changed.length > 0) {
    console.error(`\nNOT RESTORED: ${changed.map(([path]) => path).join(', ')} — restore by hand.`);
    process.exit(1);
  }

  const held = targets.length - survivors.length - broken.length;
  console.log(`\n${held}/${targets.length} checks held up by at least one test`);

  if (survivors.length > 0) console.error(`Nothing notices: ${survivors.join(', ')}`);
  if (broken.length > 0) console.error(`Could not be answered for: ${broken.join(', ')}`);

  process.exitCode = survivors.length + broken.length > 0 ? 1 : 0;
}

/* Only when run as a command. Its own test imports the two functions above, and
   importing a module that blinds twenty-two guards on the way in would be a
   surprising thing for a test file to do. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
