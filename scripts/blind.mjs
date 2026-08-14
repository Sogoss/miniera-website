/* Blinding a check, in memory.
 *
 * `npm run test:mutate` asks one question — «if this check stopped seeing
 * anything, would the suite notice?» — and until now it asked it by editing the
 * file on disk: inject `return []`, run the suite, put the file back. That
 * works, and everything unpleasant about it follows from the same fact: for a
 * few seconds the repository is not what the developer thinks it is. Hence the
 * mark left in a blinded file, the signal handlers, the restore in a `finally`
 * and the read-back that refuses to end quietly — a lot of apparatus to make a
 * dangerous method safe.
 *
 * It also made the run sequential, which is what actually hurt: two blindings
 * at once would fight over the same file, so sixty-five suites ran one after
 * the other on a machine with eight cores. That was 94% of the CI job.
 *
 * The substitution happens here instead, while Vite is loading the module: the
 * same injection, into the text on its way through the transform, in a process
 * that has its own environment. Nothing on disk changes, so there is nothing to
 * put back, nothing to recognise after a Ctrl-C, and no reason two blindings
 * cannot run side by side.
 *
 * The injection point is worked out by `checksIn`, which came over from
 * scripts/mutate-guards.mjs unchanged, with its tests: it is the part that has
 * been wrong before, and moving it was not the moment to rewrite it.
 */

/** The environment variable a blinded run carries: `path::checkName`. */
export const BLIND_ENV = 'BLIND_CHECK';

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
 * touched, was reported as held up by a test — a check with no coverage
 * certified as covered, which is the one answer this must never give. Bounded,
 * such a function is simply not found, and not-found is loud: the cross-count
 * in its own test compares these names against a second, differently derived
 * list and goes red. An argument list that never closes — an unbalanced `(`
 * inside a comment — drops out the same way, for the same reason.
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

/**
 * The same source with one check made to see nothing, or null if that check is
 * not in it.
 *
 * Null rather than the text unchanged: «the function is not here» and «the
 * function is here and now blind» have to be told apart by the caller, because
 * running the suite against an unchanged file would report the check as held up
 * by a test that never ran against a blinded anything.
 */
export function blindSource(source, name) {
  const check = checksIn(source).find((candidate) => candidate.name === name);
  if (!check) return null;

  return `${source.slice(0, check.body)}\n  return []; // blinded by scripts/blind.mjs${source.slice(check.body)}`;
}

/** `path::name` as the environment carries it, or null when nothing is blinded. */
export function blindingFromEnv(env = process.env) {
  const raw = env[BLIND_ENV];
  if (!raw) return null;

  const [path, name] = raw.split('::');
  if (!path || !name) {
    throw new Error(`${BLIND_ENV} should read \`path::checkName\`, and reads \`${raw}\``);
  }
  return { path, name };
}

/**
 * The Vite plugin that does it, for vitest.config.ts.
 *
 * `enforce: 'pre'` so the text arrives as it was written, TypeScript and all:
 * `checksIn` reads a source file, not whatever esbuild leaves behind.
 *
 * A target that cannot be found **throws**, and that is deliberate: silence
 * here would be a suite running against an untouched file and reporting the
 * check as watched. It is the one failure this whole apparatus exists to make
 * impossible, so it fails loudly, in the run that asked for it.
 */
export function blindPlugin(env = process.env) {
  const target = blindingFromEnv(env);
  if (!target) return null;

  return {
    name: 'blind-check',
    enforce: 'pre',
    transform(code, id) {
      /* Vite appends queries to ids — `?v=`, `?import` — and compares them by
         path everywhere else too. */
      if (!id.split('?')[0].endsWith(target.path)) return null;

      const blinded = blindSource(code, target.name);
      if (blinded === null) {
        throw new Error(
          `${BLIND_ENV} asks for \`${target.name}\` in ${target.path}, which does not export it: ` +
            'the suite would have run against an untouched file and called the check watched',
        );
      }
      return blinded;
    },
  };
}
