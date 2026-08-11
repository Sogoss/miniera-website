/* Negative tests for the content guards, and the frontmatter reader they use.
 *
 * The broken events below are objects, not files: the guards take the parsed
 * frontmatter precisely so that proving they fail does not require committing
 * a broken evening to the repository.
 */
import { describe, expect, it } from 'vitest';
import {
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
