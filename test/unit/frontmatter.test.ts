/* Tests for the frontmatter reader the content guards are fed from.
 *
 * It is support code, not a guard, but it decides two things a guard cannot
 * recover from: which entry a reference resolves to — get that wrong and the
 * kicker check quietly compares against nothing — and what happens when a
 * content file does not parse, which used to be «the whole test file fails to
 * load, and nobody is told which file did it».
 */
import { describe, expect, it } from 'vitest';
import { entryId, frontmatterOf } from '../support/frontmatter.ts';

describe('entryId', () => {
  it('matches the file name when the file name is already a slug', () => {
    // The four samples in the repository are all like this, which is why
    // deriving the id with basename() looked right for as long as it did.
    expect(entryId('3-terra-di-nessuno.md')).toBe('3-terra-di-nessuno');
  });

  it('slugifies the way the glob loader does', () => {
    // Astro lower-cases and slugifies every segment: a file named for the
    // cycle rather than for its slug still gets a slug as its id, and it is
    // that id the events refer to. The accent survives — github-slugger keeps
    // it, and so must this, or the two disagree in the other direction.
    expect(entryId('4-Città Aperta.md')).toBe('4-città-aperta');
  });

  it('keeps the path of an entry filed in a subdirectory', () => {
    // basename() dropped the folder and answered `x`, so the reference
    // `2027/x` matched nothing at all.
    expect(entryId('2027/x.md')).toBe('2027/x');
  });

  it('drops a trailing index segment', () => {
    expect(entryId('terra-di-nessuno/index.md')).toBe('terra-di-nessuno');
  });

  it('lets an explicit slug win', () => {
    expect(entryId('4-citta-aperta.md', { slug: 'citta-aperta' })).toBe('citta-aperta');
  });
});

describe('frontmatterOf', () => {
  it('reads the fields', () => {
    const data = frontmatterOf('---\nnumber: 81\ntitle: Chi tiene aperto\n---\n\ntesto');
    expect(data).toEqual({ number: 81, title: 'Chi tiene aperto' });
  });

  it('answers with nothing when there is no frontmatter', () => {
    expect(frontmatterOf('solo testo')).toEqual({});
  });

  it('names the file when the YAML does not parse', () => {
    // An unescaped colon in a title is the ordinary way to write invalid YAML
    // by accident. Before, this threw a bare YAMLParseError while the tests
    // were still being collected: every guard in sources.test.ts was reported
    // as not run, over one content file nobody could identify from the output.
    const broken = '---\ntitle: Chi tiene: aperto\n---\n';
    expect(() => frontmatterOf(broken, 'src/content/eventi/082.md')).toThrow(
      /src\/content\/eventi\/082\.md/,
    );
  });
});
