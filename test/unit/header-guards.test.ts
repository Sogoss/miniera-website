/* Negative tests for the three guards over dist/_headers.
 *
 * The fixtures are built with the real generator rather than typed out: what is
 * being held is that the policy and the pages agree, and a hand-written policy
 * in a test would agree with a hand-written page for reasons of its own.
 *
 * `checkStyleAttributes` is here because it was not, and the defect it now
 * catches went out to a deployment: a hash list in `style-src` covers `<style>`
 * elements and not `style` attributes, so every size this design system passes
 * as a custom property was dropped, and the site published a header at twice
 * its height with the whole suite green.
 */
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  checkAdminFetchSources,
  checkHeaderPolicy,
  checkInlineHashes,
  checkStyleAttributes,
  directive,
  fetchedUrls,
  headerRules,
  originOf,
  styleAttributes,
} from '../guards/headers.ts';
import { DETACH_CSP, hashSource, headersFile } from '../../src/lib/headers.ts';

const sha256 = (source: string) =>
  hashSource(createHash('sha256').update(source, 'utf8').digest('base64'));

const SCRIPT = "document.documentElement.classList.remove('no-js');";
const STYLE = ':root { --accent: #e8590c; }';
const ATTRIBUTE = '--brand-height: 14px';

const PAGE = `<!doctype html><html><head>
  <script>${SCRIPT}</script>
  <style>${STYLE}</style>
</head><body><span class="brand" style="${ATTRIBUTE}">x</span><h1>y</h1></body></html>`;

const HEADERS = headersFile([sha256(SCRIPT)]);

/** A list of rules written back out as a `_headers` file: how a test fabricates
 *  a variation of the real one without typing a policy by hand, which is the
 *  thing this file is careful never to do. */
const rebuilt = (rules: { path: string; lines: string[] }[]): string =>
  rules
    .map((rule) => [rule.path, ...rule.lines.map((line) => `  ${line}`)].join('\n'))
    .join('\n\n');

/** The policy this project shipped and had to take back: styles by hash, which
 *  says nothing about attributes. */
const HASHED_STYLES = HEADERS.replace(
  "style-src 'self' 'unsafe-inline'",
  `style-src 'self' ${sha256(STYLE)}`,
);

describe('headerRules', () => {
  it('reads a rule and the headers indented under it', () => {
    const rules = headerRules(HEADERS);
    // Three, because the editing desk needs two: a Cloudflare pattern is matched
    // against the path as written, so `/admin/*` does not cover `/admin`.
    expect(rules.map((rule) => rule.path)).toEqual(['/*', '/admin', '/admin/*']);
    expect(rules[0]!.lines.some((line) => line.startsWith('X-Content-Type-Options'))).toBe(true);
  });

  it('does not read the comments at the top as a rule', () => {
    expect(headerRules(HEADERS).map((rule) => rule.path)).not.toContain('#');
  });
});

describe('directive', () => {
  const policy = "default-src 'self'; script-src 'self' 'sha256-abc'; style-src 'unsafe-inline'";

  it('reads the one that is there', () => {
    expect(directive(policy, 'script-src')).toBe("script-src 'self' 'sha256-abc'");
  });

  it('falls back the way a browser does', () => {
    // style-src-attr is answered by style-src, and style-src by default-src.
    // Reading only the name asked for is how a check concludes that a policy
    // says nothing about something it governs — which is this whole file.
    expect(directive(policy, 'style-src-attr', ['style-src'])).toBe("style-src 'unsafe-inline'");
    expect(directive(policy, 'img-src', ['default-src'])).toBe("default-src 'self'");
  });

  it('answers with nothing when neither is there', () => {
    expect(directive('script-src none', 'style-src')).toBe('');
  });

  it('does not mistake a longer directive name for the one asked', () => {
    expect(directive("script-src-elem 'self'", 'script-src')).toBe('');
  });
});

describe('styleAttributes', () => {
  it('reads what each one says', () => {
    expect(styleAttributes(PAGE)).toEqual([ATTRIBUTE]);
  });

  it('does not read a <style> element as an attribute', () => {
    expect(styleAttributes('<style>a{b:c}</style>')).toEqual([]);
  });
});

describe('checkInlineHashes', () => {
  it('accepts a page whose script is in the policy', () => {
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

  it('is not satisfied by whitespace that looks the same', () => {
    // A hash covers the bytes, not the intent: a re-indented script is a
    // different script to a browser.
    const reindented = PAGE.replace(SCRIPT, `  ${SCRIPT}  `);
    expect(checkInlineHashes(reindented, HEADERS)).toHaveLength(1);
  });

  it('says nothing about a script the page loads from a file', () => {
    const external = `<html><head><script src="/_astro/x.js"></script></head><body></body></html>`;
    expect(checkInlineHashes(external, HEADERS)).toEqual([]);
  });

  it('does not read `data-src` as `src`, which would hide a script from the policy', () => {
    // A word boundary sits after the `-` of `data-src` too, so the lookahead
    // that skips external scripts skipped this one — and the generator that
    // writes the hashes calls the very same function. Neither hashed nor
    // reported: blocked in production with the whole suite green, which is the
    // exact failure this file was written against, arriving through its own
    // regex.
    const inline = `<html><head><script data-src="/x.js">${SCRIPT}</script></head></html>`;
    expect(checkInlineHashes(inline, headersFile([]))).toHaveLength(1);
    expect(checkInlineHashes(inline, HEADERS)).toEqual([]);
  });

  it('asks nothing of a <style> while style-src carries unsafe-inline', () => {
    // The decision written in src/lib/headers.ts. Demanding a hash here would
    // be a guard reporting the policy we chose, which is how a guard gets
    // switched off rather than read.
    const edited = PAGE.replace(STYLE, ':root { --accent: #123456; }');
    expect(checkInlineHashes(edited, HEADERS)).toEqual([]);
  });

  it('asks for it again the day style-src goes back to hashes', () => {
    // And this is what says the clause above is a policy reading and not a
    // hole: with hashed styles the guard is exactly as strict as before.
    const edited = PAGE.replace(STYLE, ':root { --accent: #123456; }');
    expect(checkInlineHashes(edited, HASHED_STYLES)).toHaveLength(1);
    expect(checkInlineHashes(PAGE, HASHED_STYLES)).toEqual([]);
  });

  it('reports every block of a page separately', () => {
    const two = `<html><head><script>a()</script><script>b()</script></head></html>`;
    expect(checkInlineHashes(two, HEADERS)).toHaveLength(2);
  });
});

describe('checkStyleAttributes', () => {
  it('accepts the policy this site publishes', () => {
    expect(checkStyleAttributes(PAGE, HEADERS, 'dist/index.html')).toEqual([]);
  });

  it('reports the attribute a hash-only style-src silently drops', () => {
    // The regression, exactly as it shipped. `style-src 'self' 'sha256-…'`
    // reads as if it covered the inline styles of the page; the attribute is
    // governed by style-src-attr, which needs 'unsafe-hashes'.
    const violations = checkStyleAttributes(PAGE, HASHED_STYLES, 'dist/81/index.html');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('--brand-height: 14px');
    expect(violations[0]!.detail).toContain("'unsafe-hashes'");
  });

  it('says what actually happens, which is not an error', () => {
    // The sentence matters as much as the trip: whoever reads this in CI has
    // to know they are looking for a size and not for a failure.
    const [violation] = checkStyleAttributes(PAGE, HASHED_STYLES);
    expect(violation!.detail).toContain('falls back to the default');
  });

  it('accepts an attribute whose hash is listed with unsafe-hashes', () => {
    const exact = HEADERS.replace(
      "style-src 'self' 'unsafe-inline'",
      `style-src 'self' 'unsafe-hashes' ${sha256(ATTRIBUTE)}`,
    );
    expect(checkStyleAttributes(PAGE, exact)).toEqual([]);
  });

  it('still reports one whose hash is not listed, with unsafe-hashes on', () => {
    const exact = HEADERS.replace(
      "style-src 'self' 'unsafe-inline'",
      `style-src 'self' 'unsafe-hashes' ${sha256('--guest-size: 20px')}`,
    );
    expect(checkStyleAttributes(PAGE, exact)).toHaveLength(1);
  });

  it('reads style-src-attr in preference to style-src', () => {
    // The precise directive wins, and it is the one browsers report in the
    // console message — so a guard reading only style-src would disagree with
    // the thing whoever is debugging has in front of them.
    const split = HEADERS.replace(
      "style-src 'self' 'unsafe-inline'",
      `style-src 'self' ${sha256(STYLE)}; style-src-attr 'unsafe-inline'`,
    );
    expect(checkStyleAttributes(PAGE, split)).toEqual([]);
  });

  it('counts each distinct attribute once, however often it appears', () => {
    // Seven identical `--guest-size: 20px` on a page are one defect, and seven
    // lines in CI are a guard nobody finishes reading.
    const many = `<div style="--guest-size: 20px"></div>`.repeat(7);
    expect(checkStyleAttributes(many, HASHED_STYLES)).toHaveLength(1);
  });

  it('says nothing about a page with no style attributes', () => {
    expect(checkStyleAttributes('<h1>x</h1>', HASHED_STYLES)).toEqual([]);
  });

  it('says nothing when no policy governs them at all', () => {
    // Then the pages are unrestricted and it is checkHeaderPolicy that has
    // something to say — not this one, twice.
    expect(checkStyleAttributes(PAGE, '/*\n  X-Frame-Options: DENY\n')).toEqual([]);
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
    'reports %s in script-src',
    (loose) => {
      // The half-hour-before-a-deadline fix, which leaves a file with the
      // right name and no meaning. Scripts are where the value is.
      const loosened = HEADERS.replace("script-src 'self'", `script-src 'self' ${loose}`);
      const violations = checkHeaderPolicy(loosened);
      expect(violations).toHaveLength(1);
      expect(violations[0]!.detail).toContain(loose);
    },
  );

  it('does not report unsafe-inline in style-src, which is the decision', () => {
    // Asked of the whole policy this would fire on every build, and a check
    // that reports the choice you made is one somebody deletes.
    expect(HEADERS).toContain("style-src 'self' 'unsafe-inline'");
    expect(checkHeaderPolicy(HEADERS)).toEqual([]);
  });

  it('does not mind unsafe-inline on the row of the editing desk either', () => {
    expect(HEADERS).toContain("script-src 'self'; connect-src");
    expect(checkHeaderPolicy(HEADERS)).toEqual([]);
  });

  it('reports a policy that carries no script hash at all', () => {
    // Either the generator stopped finding the scripts — every one of them is
    // then blocked — or it stopped running.
    const violations = checkHeaderPolicy(headersFile([]));
    expect(violations.some((v) => v.detail.includes("'sha256-"))).toBe(true);
  });

  it('reports a file with no rule for the editing desk at all', () => {
    const site = HEADERS.slice(0, HEADERS.indexOf('/admin'));
    const violations = checkHeaderPolicy(site);
    expect(violations).toHaveLength(2);
    expect(violations.map((v) => v.detail).join(' ')).toContain('/admin/*');
  });

  it('reports the bare /admin left out while /admin/* is there', () => {
    // The one a reader passes over. Cloudflare matches the pattern against the
    // path as written, so `/admin/*` does not cover `/admin` — which is what a
    // person types. Served the site's policy alone, with no `connect-src`, the
    // first thing an editor does is refused and nothing anywhere says so.
    const rules = headerRules(HEADERS).filter((rule) => rule.path !== '/admin');
    const violations = checkHeaderPolicy(rebuilt(rules));
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('`/admin` rule');
  });

  it('reports an admin policy that does not take the site one off first', () => {
    // The one that shipped. Both rules match `/admin/…` and Cloudflare joins a
    // header named twice with a comma — which in a CSP is two policies enforced
    // at once, so the site's `default-src 'self'` goes on forbidding
    // api.github.com however wide this row is written. The CMS does not save,
    // and nothing anywhere fails.
    const joined = HEADERS.split('\n')
      .filter((line) => line.trim() !== DETACH_CSP)
      .join('\n');
    const violations = checkHeaderPolicy(joined);
    // One for each row the desk is served at: the guard reads them separately,
    // because they can drift separately.
    expect(violations).toHaveLength(2);
    expect(violations[0]!.detail).toContain('joins a header named twice');
  });

  it('reports a detach written under the policy of its own rule', () => {
    // What the sentence above has always claimed — «and no `!` **above** it» —
    // and what the guard did not read: `some()` is as happy with the two lines
    // in either order. Reversed, the `!` names a header this very rule has just
    // set, which Cloudflare does not document: the desk ends up with both
    // policies or with none, and which one is answered in production.
    const rules = headerRules(HEADERS).map((rule) =>
      rule.path === '/admin' ? { ...rule, lines: [...rule.lines].reverse() } : rule,
    );
    const violations = checkHeaderPolicy(rebuilt(rules));
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('belongs above');
  });

  it('reports the rules written in the order that reverses their meaning', () => {
    const [site, ...admin] = headerRules(HEADERS);
    expect(checkHeaderPolicy(rebuilt([...admin, site!])).some((v) => v.detail.includes('before')))
      .toBe(true);
  });
});

/* The bundle is not ours and is not in git: it arrives from a package and is
   replaced at every install, so what it fetches can change with a version bump
   and nothing in a diff to read. These fixtures are the shape of what Sveltia
   actually ships — the three faces, declared in CSS it compiled itself. */
const FACE = (name: string, host = 'https://cdn.jsdelivr.net') =>
  `@font-face{font-family:${name};src:url(${host}/fontsource/fonts/${name}.woff2) format("woff2")}`;

const BUNDLE = [FACE('material-symbols-outlined'), FACE('source-sans-3'), FACE('noto-mono')].join('');

/** The policy as it shipped, before the widening was written: `default-src
 *  'self'` answers for the fonts, and refuses all three. */
const NO_FONT_SRC = HEADERS.replaceAll(" font-src 'self' https://cdn.jsdelivr.net;", '');

describe('fetchedUrls', () => {
  it('reads the absolute ones a stylesheet names', () => {
    expect(fetchedUrls(BUNDLE)).toHaveLength(3);
  });

  it('says nothing about a relative one, which is `self`', () => {
    expect(fetchedUrls('src:url(/fonts/x.woff2)')).toEqual([]);
  });

  it('reads through the quotes, which a minifier may or may not have left', () => {
    expect(fetchedUrls(`url("https://a.example/x.woff2")`)).toEqual(['https://a.example/x.woff2']);
    expect(fetchedUrls(`url( 'https://a.example/y.png' )`)).toEqual(['https://a.example/y.png']);
  });
});

describe('originOf', () => {
  it('keeps the scheme and the host, which is what a source list works at', () => {
    expect(originOf('https://cdn.jsdelivr.net/fontsource/x.woff2')).toBe(
      'https://cdn.jsdelivr.net',
    );
  });
});

describe('checkAdminFetchSources', () => {
  it('accepts the policy the generator writes against the bundle it is written for', () => {
    expect(checkAdminFetchSources(BUNDLE, HEADERS)).toEqual([]);
  });

  it('reports the origin the policy does not name, once per rule', () => {
    // The defect, as it shipped: `default-src 'self'` and no `font-src`, so all
    // three faces are refused. Nothing fails — the desk renders and saves — and
    // Material Symbols is a ligature font, so every control publishes its own
    // ligature where its icon should be.
    //
    // Two violations and not six: three faces from one host are one widening to
    // write, and six lines in CI are a report nobody finishes reading.
    const violations = checkAdminFetchSources(BUNDLE, NO_FONT_SRC);
    expect(violations).toHaveLength(2);
    expect(violations[0]!.detail).toContain('font-src');
    expect(violations[0]!.detail).toContain('ligature');
  });

  it('reports the row that drifted from the other', () => {
    // Two rows carry the desk and they are written by the same generator today.
    // The day one of them is edited by hand, the one a person types is the one
    // that gets forgotten.
    const drifted = rebuilt(
      headerRules(HEADERS).map((rule) =>
        rule.path === '/admin'
          ? { ...rule, lines: rule.lines.map((line) => line.replace(' https://cdn.jsdelivr.net', '')) }
          : rule,
      ),
    );
    const violations = checkAdminFetchSources(BUNDLE, drifted);
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('`/admin`');
  });

  it('asks img-src about something that is not a font', () => {
    const image = '.x{background:url(https://images.example/logo.png)}';
    const violations = checkAdminFetchSources(image, HEADERS);
    expect(violations).toHaveLength(2);
    expect(violations[0]!.detail).toContain('img-src');
    expect(violations[0]!.detail).not.toContain('ligature');
  });

  it('accepts what img-src already names, which is where the blob: preview lives', () => {
    const avatar = '.x{background:url(https://avatars.githubusercontent.com/u/1)}';
    expect(checkAdminFetchSources(avatar, HEADERS)).toEqual([]);
  });

  it('says nothing about a row that declares no policy at all', () => {
    // That is checkHeaderPolicy's report, and saying it twice is how a report
    // stops being read.
    const bare = '/*\n  X-Frame-Options: DENY\n\n/admin\n  X-Frame-Options: DENY\n';
    expect(checkAdminFetchSources(BUNDLE, bare)).toEqual([]);
  });

  it('says nothing about a bundle that fetches nothing from anywhere', () => {
    expect(checkAdminFetchSources('export const a = 1;', HEADERS)).toEqual([]);
  });
});
