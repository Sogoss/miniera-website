/* Negative tests for the four date guards.
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
  checkMachineDateText,
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

  it('leaves an expression it cannot work out alone', () => {
    // Guessing at an expression would be a guard that fires on correct work,
    // and one of those gets switched off. A bare name is a different case —
    // see just below.
    const source = `const f = new Intl.DateTimeFormat('it-IT', { timeZone: zoneFor(event) });`;
    expect(checkMissingTimeZone(source, 'src/lib/events.ts')).toEqual([]);
  });

  it('reports a zone constant that is declared nowhere in the file', () => {
    // The next refactor this codebase invites: the day the Timeline needs the
    // zone too, `ROME` gets exported from events.ts and imported here. The
    // guard reads one file at a time, so from then on it would wave through
    // every formatter in the project — `timeZone: ZONE` looks the same whether
    // the other module says `'Europe/Rome'` or `'UTC'`.
    const source = [
      `import { ZONE } from './zone.ts';`,
      `const f = new Intl.DateTimeFormat('it-IT', { timeZone: ZONE });`,
    ].join('\n');
    const violations = checkMissingTimeZone(source, 'src/components/Timeline.astro');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('ZONE');
    expect(violations[0]!.detail).toContain('src/components/Timeline.astro:2');
  });

  it('does not accept a timeZone that is only written in a comment', () => {
    // The way this guard failed open: the scan skipped the comments so an
    // apostrophe inside one could not open a string, but then handed back the
    // span with the comments still in it. A line commented out while debugging
    // — or a `// timeZone: 'Europe/Rome' — TODO` left behind — answered for a
    // call that declares nothing, and the site published «ore 19».
    const lineComment = [
      `const f = new Intl.DateTimeFormat('it-IT', {`,
      `  // timeZone: 'Europe/Rome',`,
      `  hour: 'numeric',`,
      `});`,
    ].join('\n');
    expect(checkMissingTimeZone(lineComment, 'src/lib/events.ts')).toHaveLength(1);

    const blockComment = `const f = new Intl.DateTimeFormat('it-IT', { /* timeZone: 'Europe/Rome' */ hour: 'numeric' });`;
    expect(checkMissingTimeZone(blockComment, 'src/lib/events.ts')).toHaveLength(1);
  });

  it('still reads the real zone on a call whose arguments carry a comment', () => {
    // The other direction of the same change: blanking the comments must not
    // blank what surrounds them, or every correctly written formatter with a
    // note in it would be reported.
    const source = [
      `const f = new Intl.DateTimeFormat('it-IT', {`,
      `  // l'ora della serata, in Italia`,
      `  timeZone: 'Europe/Rome',`,
      `  hour: 'numeric',`,
      `});`,
    ].join('\n');
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

  it('is not switched off by a glob that looks like an open comment', () => {
    // The glob below carries a comment closer at its second character and an
    // opener at its third, so the open-comment test read everything after it
    // as commented out. src/content.config.ts writes that glob on line 31, and
    // from there down all three guards were returning nothing at all.
    const source = [
      `const events = { loader: glob({ pattern: '**/*.md', base: 'src/content/eventi' }) };`,
      `const f = new Intl.DateTimeFormat('it-IT', { day: 'numeric' });`,
    ].join('\n');
    const violations = checkMissingTimeZone(source, 'src/content.config.ts');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('src/content.config.ts:2');
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

  it('is not switched off by a glob that looks like an open comment', () => {
    const source = [`const pattern = '**/*.md';`, `const hour = scene.date.getHours();`].join('\n');
    expect(checkLocalDateMethods(source, 'src/content.config.ts')).toHaveLength(1);
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

  it('is not switched off by a glob that looks like an open comment', () => {
    const source = [`const pattern = '**/*.md';`, `const now = new Date();`].join('\n');
    expect(checkAmbientTime(source, 'src/content.config.ts')).toHaveLength(1);
  });
});

describe('checkMachineDateText', () => {
  it('reports a Date that reached the markup as a string', () => {
    // What `{scene.date}` publishes. No call-shaped guard can see it: it is
    // `toString()`, which every object has, and the source reads as an
    // ordinary interpolation.
    const html = `<p>Thu Sep 24 2026 21:00:00 GMT+0200 (Ora legale dell'Europa centrale)</p>`;
    const violations = checkMachineDateText(html, 'dist/index.html');
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0]!.rule).toBe('rule 11');
    expect(violations[0]!.detail).toContain('dist/index.html:1');
  });

  it('sees the halves separately, because each of them arrives alone', () => {
    // `toDateString()` publishes no offset and `toTimeString()` no weekday:
    // a check that wanted the whole string would miss both.
    expect(checkMachineDateText('<p>Thu Sep 24 2026</p>', 'dist/index.html')).toHaveLength(1);
    expect(
      checkMachineDateText('<p>21:00:00 GMT+0000</p>', 'dist/78/index.html'),
    ).toHaveLength(1);
  });

  it('reports toUTCString(), which shares no character with the others', () => {
    // `Thu, 24 Sep 2026 19:00:00 GMT`: a comma, the day before the month, and
    // a bare `GMT`. It is the shape a `datetime` attribute gets written in by
    // hand, it is neither a formatter nor a local method, and it is the same
    // two hours early — 19:00 for an evening that starts at 21.
    const published = new Date('2026-09-24T21:00:00+02:00').toUTCString();
    expect(checkMachineDateText(`<time datetime="${published}">`, 'dist/index.html').length)
      .toBeGreaterThan(0);
  });

  it('leaves the Italian strings the domain writes alone', () => {
    // The whole published heading of a scene, the Timeline tick, and the
    // machine-readable attribute — which is UTC and says so, and means the
    // same instant wherever it is read.
    const html = [
      `<time datetime="2026-09-24T19:00:00.000Z">giovedì 24 settembre 2026, ore 21</time>`,
      `<span>24 set 2026</span>`,
    ].join('\n');
    expect(checkMachineDateText(html, 'dist/index.html')).toEqual([]);
  });
});
