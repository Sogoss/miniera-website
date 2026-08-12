/* Negative tests for the content guards, and the frontmatter reader they use.
 *
 * The broken events below are objects, not files: the guards take the parsed
 * frontmatter precisely so that proving they fail does not require committing
 * a broken evening to the repository.
 */
import { describe, expect, it } from 'vitest';
import {
  checkDateHasOffset,
  checkDuplicateSpeakers,
  checkKickerRepeatsCycle,
} from '../guards/content.ts';
import { frontmatterOf } from '../support/frontmatter.ts';

const EVENT = {
  number: 81,
  title: 'Chi tiene aperto il quartiere',
  speakers: [{ person: 'amina-belhaj' }, { person: 'piergiorgio-rosso' }],
};

describe('checkDuplicateSpeakers', () => {
  it('passes when every speaker appears once', () => {
    expect(checkDuplicateSpeakers(EVENT, '081.md')).toEqual([]);
  });

  it('reports the same person listed twice', () => {
    // The shape event 81 was actually in: a role override written as a second
    // entry instead of on the first one.
    const broken = {
      ...EVENT,
      speakers: [
        { person: 'amina-belhaj' },
        { person: 'amina-belhaj', role: 'presidente del comitato di quartiere' },
      ],
    };
    const violations = checkDuplicateSpeakers(broken, '081.md');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.rule).toBe('content');
    expect(violations[0]!.detail).toContain('amina-belhaj');
  });

  it('reports a person listed three times only twice — once per repetition', () => {
    const broken = {
      speakers: [{ person: 'x' }, { person: 'x' }, { person: 'x' }],
    };
    expect(checkDuplicateSpeakers(broken, '081.md')).toHaveLength(2);
  });

  it('says nothing about an event with no speakers at all', () => {
    expect(checkDuplicateSpeakers({ number: 4 }, '004.md')).toEqual([]);
  });
});

describe('checkKickerRepeatsCycle', () => {
  it('passes when there is no kicker', () => {
    expect(checkKickerRepeatsCycle(EVENT, 'Terra di nessuno', '081.md')).toEqual([]);
  });

  it('reports a kicker repeating the name of its cycle', () => {
    const broken = { ...EVENT, kicker: 'Ciclo 3 · Terra di nessuno' };
    const violations = checkKickerRepeatsCycle(broken, 'Terra di nessuno', '081.md');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('Terra di nessuno');
  });

  it('ignores case and accents', () => {
    const broken = { kicker: 'una sera in TERRA DI NESSUNO' };
    expect(checkKickerRepeatsCycle(broken, 'Terrà di nessuno', '081.md')).toHaveLength(1);
  });

  it('leaves a kicker that says something else alone', () => {
    const fine = { kicker: 'Con le portinerie sociali di Torino' };
    expect(checkKickerRepeatsCycle(fine, 'Terra di nessuno', '081.md')).toEqual([]);
  });

  it('stays quiet when the cycle name is missing, instead of matching everything', () => {
    // An empty needle is contained in every haystack: without the guard clause
    // this would report every event that has a kicker.
    const fine = { kicker: 'Con le portinerie sociali di Torino' };
    expect(checkKickerRepeatsCycle(fine, '', '081.md')).toEqual([]);
  });
});

/* The guard that had no negative case until PR 4 went looking.
 *
 * It was written in PR 3 and used in one place, over the real content, where it
 * is expected to return nothing — so nobody had ever seen it fire, which by the
 * standard of this repository makes it indistinguishable from a guard that is
 * not looking. It was in fact working; what was missing is what keeps it
 * working, and that is what these are.
 */
describe('checkDateHasOffset', () => {
  const dated = (date: unknown) => checkDateHasOffset({ ...EVENT, date }, 'src/content/eventi/081.md');

  it('accepts the two offsets Italy is on', () => {
    // Summer and winter are both right — the file has to carry whichever Italy
    // was on that night, and which one that is, is not this guard's business.
    expect(dated('2026-09-24T21:00:00+02:00')).toEqual([]);
    expect(dated('2026-11-05T21:00:00+01:00')).toEqual([]);
  });

  it('accepts a date written in UTC, and the shapes a widget writes', () => {
    expect(dated('2026-11-05T20:00:00Z')).toEqual([]);
    expect(dated('2026-11-05T21:00+01:00')).toEqual([]);
    expect(dated('2026-11-05T21:00:00+0100')).toEqual([]);
  });

  it('reports a date with no offset, which is the defect it exists for', () => {
    // Read on Cloudflare, in UTC, this evening at nine is published as «ore 22»
    // — and reads correctly on the laptop of whoever typed it, so nothing looks
    // wrong until it is live.
    const violations = dated('2026-11-05T21:00:00');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.rule).toBe('content');
    expect(violations[0]!.detail).toContain('src/content/eventi/081.md');
    expect(violations[0]!.detail).toContain('ore 22');
  });

  it('reports a bare date and a missing one', () => {
    expect(dated('2026-11-05')).toHaveLength(1);
    expect(dated(undefined)).toHaveLength(1);
    expect(dated('')).toHaveLength(1);
  });

  it('refuses to answer about a date that reaches it already parsed', () => {
    // The failure mode that would make it pass on the very files it is for: a
    // Date has no text left, `toISOString()` ends in `Z` whatever was written,
    // and the guard would go green on every evening. It says so instead of
    // guessing.
    const violations = dated(new Date('2026-11-05T21:00:00+01:00'));
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('already parsed');
  });
});

describe('frontmatterOf', () => {
  it('reads the nested speakers list', () => {
    const markdown = [
      '---',
      'number: 81',
      'speakers:',
      '  - person: amina-belhaj',
      '  - person: piergiorgio-rosso',
      '    role: presidente del comitato di quartiere',
      '---',
      '',
      'Il corpo del file.',
    ].join('\n');

    const data = frontmatterOf(markdown);
    expect(data.number).toBe(81);
    expect(data.speakers).toEqual([
      { person: 'amina-belhaj' },
      { person: 'piergiorgio-rosso', role: 'presidente del comitato di quartiere' },
    ]);
  });

  it('returns nothing for a file without frontmatter', () => {
    expect(frontmatterOf('# Solo testo\n')).toEqual({});
  });

  it('does not mistake a horizontal rule in the body for the frontmatter', () => {
    expect(frontmatterOf('Testo\n\n---\n\nAltro testo\n')).toEqual({});
  });
});
