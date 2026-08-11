/* Negative tests for the two date guards.
 *
 * The sources they are pointed at are strings written here, for the usual
 * reason: proving a guard can fail must not require committing the defect. A
 * guard nobody has seen trip is indistinguishable from one that is not
 * looking, and this pair is aimed at defects that leave no trace anywhere else
 * — a site two hours ahead of itself is a site that builds and passes.
 */
import { describe, expect, it } from 'vitest';
import { checkAmbientTime, checkMissingTimeZone } from '../guards/dates.ts';

describe('checkMissingTimeZone', () => {
  it('passes a formatter that names its zone', () => {
    const source = `const f = new Intl.DateTimeFormat('it-IT', {\n  timeZone: 'Europe/Rome',\n  day: 'numeric',\n});`;
    expect(checkMissingTimeZone(source, 'src/lib/events.ts')).toEqual([]);
  });

  it('reports a formatter without one', () => {
    const source = `const f = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' });`;
    const violations = checkMissingTimeZone(source, 'src/lib/events.ts');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.rule).toBe('rule 11');
    expect(violations[0]!.detail).toContain('Intl.DateTimeFormat');
  });

  it('reports the three toLocale… calls, which is how one gets written by accident', () => {
    const source = [
      `event.date.toLocaleDateString('it-IT');`,
      `event.date.toLocaleTimeString('it-IT');`,
      `event.date.toLocaleString('it-IT');`,
    ].join('\n');
    expect(checkMissingTimeZone(source, 'src/pages/index.astro')).toHaveLength(3);
  });

  it('passes a toLocale… call that does name its zone', () => {
    // Forbidding the call outright would be a guard switched off the first
    // time somebody legitimately needed it, taking the rest along.
    const source = `event.date.toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' });`;
    expect(checkMissingTimeZone(source, 'src/pages/index.astro')).toEqual([]);
  });

  it('says which line, because the file will have several formatters', () => {
    const source = `const ok = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome' });\nconst no = new Intl.DateTimeFormat('it-IT', { day: 'numeric' });`;
    const violations = checkMissingTimeZone(source, 'src/lib/events.ts');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('src/lib/events.ts:2');
  });

  it('is not fooled by a closing parenthesis inside a string', () => {
    // Without quotes being respected the arguments would be read as
    // `locale(')` — the timeZone below the cut, and a correct call reported.
    const source = `const f = new Intl.DateTimeFormat(locale(')'), { timeZone: 'Europe/Rome' });`;
    expect(checkMissingTimeZone(source, 'src/lib/events.ts')).toEqual([]);
  });

  it('reads past a nested call', () => {
    const source = `const f = new Intl.DateTimeFormat(pick(locale, fallback), { timeZone: zone() });`;
    expect(checkMissingTimeZone(source, 'src/lib/events.ts')).toEqual([]);
  });

  it('ignores a mention on a comment line', () => {
    // Which is how these names appear in the guard's own file, and in the
    // module it guards.
    const source = [
      `// never toLocaleDateString('it-IT') without a zone`,
      ` * or Intl.DateTimeFormat('it-IT') either`,
      `/* not even here: Intl.DateTimeFormat('it-IT') */`,
    ].join('\n');
    expect(checkMissingTimeZone(source, 'src/lib/events.ts')).toEqual([]);
  });
});

describe('checkAmbientTime', () => {
  it('passes a module that takes the time as an argument', () => {
    const source = `export function isPast(date: Date, now: Date) {\n  return romeDay(date) < romeDay(now);\n}`;
    expect(checkAmbientTime(source, 'src/lib/events.ts')).toEqual([]);
  });

  it('reports a clock read', () => {
    const source = `export function isPast(date: Date) {\n  return date < new Date();\n}`;
    const violations = checkAmbientTime(source, 'src/lib/events.ts');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.rule).toBe('rule 11');
    expect(violations[0]!.detail).toContain('src/lib/events.ts:2');
  });

  it('reports Date.now() too', () => {
    expect(checkAmbientTime(`const t = Date.now();`, 'src/lib/events.ts')).toHaveLength(1);
  });

  it('leaves a date built from a value alone', () => {
    const source = `const a = new Date(iso);\nconst b = new Date(2026, 8, 24);`;
    expect(checkAmbientTime(source, 'src/lib/events.ts')).toEqual([]);
  });

  it('ignores a mention on a comment line', () => {
    expect(checkAmbientTime(`// no new Date() here`, 'src/lib/events.ts')).toEqual([]);
  });
});
