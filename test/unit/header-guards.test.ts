/* Negative tests for the two guards over dist/_headers.
 *
 * The fixtures are built with the real generator rather than typed out: what is
 * being held is that the policy and the pages agree, and a hand-written policy
 * in a test would agree with a hand-written page for reasons of its own.
 */
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { checkHeaderPolicy, checkInlineHashes, headerRules } from '../guards/headers.ts';
import { hashSource, headersFile } from '../../src/lib/headers.ts';

const sha256 = (source: string) =>
  hashSource(createHash('sha256').update(source, 'utf8').digest('base64'));

const SCRIPT = "document.documentElement.classList.remove('no-js');";
const STYLE = ':root { --accent: #e8590c; }';

const PAGE = `<!doctype html><html><head>
  <script>${SCRIPT}</script>
  <style>${STYLE}</style>
</head><body><h1>x</h1></body></html>`;

const HEADERS = headersFile([sha256(SCRIPT)], [sha256(STYLE)]);

describe('headerRules', () => {
  it('reads a rule and the headers indented under it', () => {
    const rules = headerRules(HEADERS);
    expect(rules.map((rule) => rule.path)).toEqual(['/*', '/admin/*']);
    expect(rules[0]!.lines.some((line) => line.startsWith('X-Content-Type-Options'))).toBe(true);
  });

  it('does not read the comments at the top as a rule', () => {
    // They start in column one, like a rule path does.
    expect(headerRules(HEADERS).map((rule) => rule.path)).not.toContain('#');
  });
});

describe('checkInlineHashes', () => {
  it('accepts a page whose blocks are all in the policy', () => {
    expect(checkInlineHashes(PAGE, HEADERS, 'dist/index.html')).toEqual([]);
  });

  it('reports a script that has been edited since the policy was written', () => {
    // The failure with no other witness: the build is green, the markup is
    // right, the page renders, and the script does not run.
    const edited = PAGE.replace(SCRIPT, `${SCRIPT} // una riga in più`);
    const violations = checkInlineHashes(edited, HEADERS, 'dist/index.html');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('inline <script>');
  });

  it('reports an edited style the same way', () => {
    const edited = PAGE.replace(STYLE, ':root { --accent: #123456; }');
    expect(checkInlineHashes(edited, HEADERS)).toHaveLength(1);
  });

  it('is not satisfied by whitespace that looks the same', () => {
    // A hash covers the bytes, not the intent: a re-indented script is a
    // different script to a browser, and this is the case that says the guard
    // is comparing what the browser compares.
    const reindented = PAGE.replace(SCRIPT, `  ${SCRIPT}  `);
    expect(checkInlineHashes(reindented, HEADERS)).toHaveLength(1);
  });

  it('says nothing about a script the page loads from a file', () => {
    // `'self'` covers those, and there is no body to hash.
    const external = `<html><head><script src="/_astro/x.js"></script></head><body></body></html>`;
    expect(checkInlineHashes(external, HEADERS)).toEqual([]);
  });

  it('reports every block of a page separately', () => {
    const two = `<html><head><script>a()</script><script>b()</script></head></html>`;
    expect(checkInlineHashes(two, HEADERS)).toHaveLength(2);
  });

  it('reports everything when the file has no /* rule to read', () => {
    expect(checkInlineHashes(PAGE, '/admin/*\n  X-Frame-Options: DENY\n')).toHaveLength(2);
  });
});

describe('checkHeaderPolicy', () => {
  it('accepts the file the generator writes', () => {
    expect(checkHeaderPolicy(HEADERS)).toEqual([]);
  });

  it('reports a file with no /* rule', () => {
    const violations = checkHeaderPolicy('/admin/*\n  X-Frame-Options: DENY\n');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('no `/*` rule');
  });

  it('reports a missing security header', () => {
    expect(checkHeaderPolicy(HEADERS.replace(/\s*X-Content-Type-Options:.*\n/, '\n')))
      .toHaveLength(1);
  });

  it.each(["'unsafe-inline'", "'unsafe-eval'"])(
    'reports %s in the policy of the site',
    (loose) => {
      // The half-hour-before-a-deadline fix, which leaves a file with the right
      // name and no meaning.
      const loosened = HEADERS.replace("script-src 'self'", `script-src 'self' ${loose}`);
      const violations = checkHeaderPolicy(loosened);
      expect(violations).toHaveLength(1);
      expect(violations[0]!.detail).toContain(loose);
    },
  );

  it('does not mind unsafe-inline on the row of the editing desk', () => {
    // Sveltia writes its own styles as it renders and there is no build of ours
    // to hash. It is declared there, with the reason beside it.
    expect(HEADERS).toContain("style-src 'self' 'unsafe-inline'");
    expect(checkHeaderPolicy(HEADERS)).toEqual([]);
  });

  it('reports a policy that carries no hash at all', () => {
    // Either the generator stopped finding the scripts — every one of them is
    // then blocked — or it stopped running.
    const empty = headersFile([], []);
    const violations = checkHeaderPolicy(empty);
    expect(violations.some((v) => v.detail.includes("'sha256-"))).toBe(true);
  });

  it('reports a missing /admin/* rule', () => {
    const site = HEADERS.slice(0, HEADERS.indexOf('/admin/*'));
    const violations = checkHeaderPolicy(site);
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('/admin/*');
  });

  it('reports the two rules written in the order that reverses their meaning', () => {
    const rules = headerRules(HEADERS);
    const swapped = [rules[1]!, rules[0]!]
      .map((rule) => [rule.path, ...rule.lines.map((line) => `  ${line}`)].join('\n'))
      .join('\n\n');
    const violations = checkHeaderPolicy(swapped);
    expect(violations.some((v) => v.detail.includes('before'))).toBe(true);
  });
});
