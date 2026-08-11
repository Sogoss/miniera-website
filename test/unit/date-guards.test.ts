/* Negative tests for the three date guards.
 *
 * The sources they are pointed at are strings written here, for the usual
 * reason: proving a guard can fail must not require committing the defect. A
 * guard nobody has seen trip is indistinguishable from one that is not
 * looking, and these are aimed at defects that leave no trace anywhere else —
 * a site two hours ahead of itself is a site that builds and passes.
 *
 * Several of the cases below are guards failing *open*, which is the way this
 * kind of check dies: it keeps returning `[]` and nobody notices that it
 * stopped meaning anything.
 */
import { describe, expect, it } from 'vitest';
import {
  checkAmbientTime,
  checkLocalDateMethods,
  checkMissingTimeZone,
} from '../guards/dates.ts';

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

  it('reports a formatter that names the wrong zone', () => {
    // `'UTC'` is written half a dozen times in this suite and in
    // test/support/build.ts, ready to be copied into a component. A guard that
    // only looked for the word `timeZone` would wave it through.
    const source = `const f = new Intl.DateTimeFormat('it-IT', { timeZone: 'UTC', hour: 'numeric' });`;
    const violations = checkMissingTimeZone(source, 'src/components/Timeline.astro');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('UTC');
    expect(violations[0]!.detail).toContain('Europe/Rome');
  });

  it('follows a constant to its declaration, which is how events.ts writes it', () => {
    const good = `const ROME = 'Europe/Rome';\nconst f = new Intl.DateTimeFormat('it-IT', { timeZone: ROME });`;
    expect(checkMissingTimeZone(good, 'src/lib/events.ts')).toEqual([]);

    const bad = `const ROME = 'UTC';\nconst f = new Intl.DateTimeFormat('it-IT', { timeZone: ROME });`;
    expect(checkMissingTimeZone(bad, 'src/lib/events.ts')).toHaveLength(1);
  });

  it('leaves a zone it cannot work out alone', () => {
    // Guessing at an expression would be a guard that fires on correct work,
    // and one of those gets switched off.
    const source = `const f = new Intl.DateTimeFormat('it-IT', { timeZone: zoneFor(event) });`;
    expect(checkMissingTimeZone(source, 'src/lib/events.ts')).toEqual([]);
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

  it('is not disarmed by an apostrophe in a comment inside the arguments', () => {
    // The way this guard died in review: `l'ora` opens a string that never
    // closes, the scan runs off the end of the call, and it finds the
    // timeZone of the *next* formatter — reporting nothing at all.
    const source = [
      `const bad = new Intl.DateTimeFormat('it-IT', {`,
      `  // l'ora della serata`,
      `  hour: 'numeric',`,
      `});`,
      `const ok = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome' });`,
    ].join('\n');
    const violations = checkMissingTimeZone(source, 'src/lib/events.ts');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('src/lib/events.ts:1');
  });

  it('reports rather than goes quiet when the call never closes', () => {
    const source = `const f = new Intl.DateTimeFormat('it-IT', { day: 'numeric'`;
    expect(checkMissingTimeZone(source, 'src/lib/events.ts')).toHaveLength(1);
  });

  it('ignores a mention in a comment', () => {
    // Which is how these names appear in the guards' own file, and in the
    // module they guard — including on the continuation line of a block
    // comment, which carries no marker of its own.
    const source = [
      `// never toLocaleDateString('it-IT') without a zone`,
      `/* not here either:`,
      `   new Intl.DateTimeFormat('it-IT') would be wrong. */`,
      `const url = 'https://example.org'; // and Intl.DateTimeFormat('it-IT')`,
    ].join('\n');
    expect(checkMissingTimeZone(source, 'src/lib/events.ts')).toEqual([]);
  });

  it('still reads a line that merely carries a URL', () => {
    // The `//` of a protocol must not be mistaken for a comment, or a whole
    // line goes unguarded.
    const source = `const site = 'https://laminieraculturale.it'; const f = new Intl.DateTimeFormat('it-IT');`;
    expect(checkMissingTimeZone(source, 'src/lib/events.ts')).toHaveLength(1);
  });
});

describe('checkLocalDateMethods', () => {
  it('reports the date components read in the machine zone', () => {
    const source = `const hour = scene.date.getHours();\nconst weekday = scene.date.getDay();`;
    const violations = checkLocalDateMethods(source, 'src/components/EventCard.astro');
    expect(violations).toHaveLength(2);
    expect(violations[0]!.rule).toBe('rule 11');
    expect(violations[0]!.detail).toContain('getHours');
  });

  it('leaves getTime and the getUTC… family alone', () => {
    // They mean the same thing on every machine, which is the whole point.
    const source = `a.date.getTime() <= b.date.getTime();\nconst y = d.getUTCFullYear();`;
    expect(checkLocalDateMethods(source, 'src/lib/events.ts')).toEqual([]);
  });

  it('ignores a mention in a comment', () => {
    const source = `/* a note about getDay()\n   and getHours(), neither of which we call. */`;
    expect(checkLocalDateMethods(source, 'src/lib/events.ts')).toEqual([]);
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

  it('ignores a mention in a comment, continuation lines included', () => {
    // programme.ts already closes with a block comment whose continuation
    // lines start with plain spaces. A guard that went red on prose would be
    // fixed by rewording the prose, which is how a guard gets switched off.
    const source = [`/* a note about how we do not call`, `   new Date() in here. */`].join('\n');
    expect(checkAmbientTime(source, 'src/lib/events.ts')).toEqual([]);
  });
});
