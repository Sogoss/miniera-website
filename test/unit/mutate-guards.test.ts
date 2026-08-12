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
import { checksIn, sourceFiles } from '../../scripts/mutate-guards.mjs';
import { read } from '../support/paths.ts';

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
});

describe('the checks the script will find in this repository', () => {
  const files = sourceFiles();

  /** The same count, arrived at without the scanner. */
  const declared = files.flatMap((path: string) =>
    [...read(path).matchAll(/^export function ((?:check|find)\w+)/gm)].map((match) => match[1]!),
  );

  it('reads both folders where a check can live', () => {
    expect(files.some((path: string) => path.startsWith('test/guards/'))).toBe(true);
    expect(files.some((path: string) => path.startsWith('src/lib/'))).toBe(true);
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
