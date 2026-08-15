/* The guards over the file the build writes for Cloudflare, and they ask the
 * three different questions a generated policy can fail.
 *
 * The first is the one with no other witness: **does the policy still cover
 * what the pages contain?** Every script this site runs is inline, so every one
 * of them is in the policy as a hash — and a hash stops matching the moment a
 * character of that script changes. Nothing fails when it happens: the build is
 * green, the markup is right, the page renders, and the script simply does not
 * run in a browser that enforces the policy. The modal stops opening. Nobody
 * sees it except a visitor with the console open, which is nobody.
 *
 * The second asks whether the policy is still worth having. A CSP is loosened
 * under pressure — something breaks half an hour before a deadline, somebody
 * writes `'unsafe-inline'`, everything works, and the file keeps its name and
 * its shape while meaning nothing. That is not a hypothetical about this
 * project; it is what the entire generator exists to make unnecessary.
 *
 * The third is about the one thing here we do not write: the CMS bundle, which
 * arrives from a package, is gitignored, and fetches its own fonts from an
 * origin our policy has to name. A version bump can add a second one with
 * nothing in a diff to read — and nothing fails when it does.
 */
import { createHash } from 'node:crypto';
import { hashSource, inlineScripts, inlineStyles } from '../../src/lib/headers.ts';
import { ADMIN_PATHS, DETACH_CSP, SECURITY_HEADERS } from '../../src/lib/headers.ts';
import { type Violation } from './types.ts';

/** The path each block of the file applies to, with its lines. Cloudflare's
 *  format: a rule starts in column one, its headers are indented under it. */
export function headerRules(file: string): { path: string; lines: string[] }[] {
  const rules: { path: string; lines: string[] }[] = [];

  for (const raw of file.split('\n')) {
    const line = raw.replace(/^\s*#.*$/, '');
    if (line.trim() === '') continue;

    if (/^\S/.test(line)) rules.push({ path: line.trim(), lines: [] });
    else rules[rules.length - 1]?.lines.push(line.trim());
  }

  return rules;
}

/** The value of a header inside a rule, or nothing. */
function headerValue(rule: { lines: string[] } | undefined, name: string): string | undefined {
  const found = rule?.lines.find((line) => line.toLowerCase().startsWith(`${name.toLowerCase()}:`));
  return found?.slice(found.indexOf(':') + 1).trim();
}

function sha256(source: string): string {
  return createHash('sha256').update(source, 'utf8').digest('base64');
}

/** The source list of one directive of a policy, falling back the way a browser
 *  does: `style-src-attr` is answered by `style-src` when it is not there, and
 *  `style-src` by `default-src`. Reading only the name that was asked for is
 *  how a check concludes that a policy says nothing about something it governs. */
export function directive(policy: string, name: string, fallbacks: string[] = []): string {
  for (const wanted of [name, ...fallbacks]) {
    const found = policy
      .split(';')
      .map((part) => part.trim())
      .find((part) => part === wanted || part.startsWith(`${wanted} `));
    if (found !== undefined) return found;
  }
  return '';
}

/** Every `style="…"` a page publishes, with what it says. */
export function styleAttributes(html: string): string[] {
  return [...html.matchAll(/\sstyle="([^"]*)"/gi)].map((match) => match[1] ?? '');
}

/**
 * Every inline script and style of a page is covered by the published policy.
 *
 * The page comes from dist/ and so does the file: what a browser hashes is what
 * it received, and a check run over the source would agree with itself while
 * the two published artefacts disagreed.
 */
export function checkInlineHashes(
  html: string,
  headers: string,
  path = 'the page',
): Violation[] {
  const site = headerRules(headers).find((rule) => rule.path === '/*');
  const policy = headerValue(site, 'Content-Security-Policy') ?? '';
  const violations: Violation[] = [];

  const blocks = [
    ...inlineScripts(html).map((body) => ({ body, kind: 'script' as const })),
    ...inlineStyles(html).map((body) => ({ body, kind: 'style' as const })),
  ];

  for (const { body, kind } of blocks) {
    /* Asked of the directive that governs *this* kind of block, and only when
       that directive needs a hash: `style-src` carries `'unsafe-inline'` by the
       decision written in src/lib/headers.ts, and demanding a hash there would
       be a guard reporting the policy we chose. */
    const governing =
      kind === 'script'
        ? directive(policy, 'script-src-elem', ['script-src', 'default-src'])
        : directive(policy, 'style-src-elem', ['style-src', 'default-src']);

    if (governing.includes("'unsafe-inline'")) continue;

    const hash = hashSource(sha256(body));
    if (governing.includes(hash)) continue;

    const first = body.trim().split('\n')[0]?.slice(0, 60) ?? '';
    violations.push({
      rule: 'headers',
      detail: `${path} carries an inline <${kind}> whose hash ${hash} is not in the Content-Security-Policy of \`/*\` in dist/_headers. The page renders and the ${kind} does not run: nothing fails, and what breaks is whatever that code was for — «${first}…»`,
    });
  }

  return violations;
}

/**
 * The policy is still a policy.
 *
 * Five things, and each of them is a way the file goes on existing without
 * doing anything.
 */
export function checkHeaderPolicy(headers: string, path = 'dist/_headers'): Violation[] {
  const violations: Violation[] = [];
  const rules = headerRules(headers);
  const site = rules.find((rule) => rule.path === '/*');

  if (site === undefined) {
    return [
      {
        rule: 'headers',
        detail: `${path} has no \`/*\` rule, so nothing it says reaches a page of this site`,
      },
    ];
  }

  for (const [name] of SECURITY_HEADERS) {
    if (headerValue(site, name) === undefined) {
      violations.push({
        rule: 'headers',
        detail: `${path}: \`/*\` does not send \`${name}\`, which src/lib/headers.ts declares. A header that is declared and not published is the shape this file fails in — it looks complete`,
      });
    }
  }

  const policy = headerValue(site, 'Content-Security-Policy');

  if (policy === undefined) {
    violations.push({
      rule: 'headers',
      detail: `${path}: \`/*\` sends no \`Content-Security-Policy\`, and every script this site runs is inline — which is to say there is nothing between a stored cross-site script and the reader`,
    });
  } else {
    /* Asked of `script-src` and not of the whole policy. `style-src` carries
       `'unsafe-inline'` on purpose — a hash there covers a `<style>` element
       and not a `style` attribute, and this design system passes its sizes as
       attributes; see src/lib/headers.ts. Asked of the whole string, this
       check would report that decision every time, which is how a check gets
       deleted rather than read. Scripts are where the value is and they stay
       exact. */
    const scripts = directive(policy, 'script-src', ['default-src']);

    for (const loose of ["'unsafe-inline'", "'unsafe-eval'"]) {
      if (!scripts.includes(loose)) continue;

      violations.push({
        rule: 'headers',
        detail: `${path}: \`script-src\` contains ${loose}. It is the half-hour-before-a-deadline fix, and it leaves a file with the right name and no meaning: the hashes are generated by the build precisely so that nobody ever needs it — see src/lib/headers.ts`,
      });
    }

    if (!/'sha256-/.test(policy)) {
      violations.push({
        rule: 'headers',
        detail: `${path}: the policy of \`/*\` carries no \`'sha256-…'\` source at all, and this site publishes nothing but inline scripts. Either the generator stopped finding them — in which case every script is blocked — or it stopped running`,
      });
    }
  }

  const siteAt = rules.findIndex((rule) => rule.path === '/*');

  /* Both of them, and asked by name rather than by shape: `/admin/*` does not
     match the bare `/admin`, which is the address a person types — see
     ADMIN_PATHS. A rule missing there is a desk served the site's policy alone,
     and it looks like the one next to it. */
  for (const adminPath of ADMIN_PATHS) {
    const adminAt = rules.findIndex((rule) => rule.path === adminPath);

    if (adminAt === -1) {
      violations.push({
        rule: 'headers',
        detail: `${path} has no \`${adminPath}\` rule: the editing desk takes the site's policy, which forbids everything Sveltia needs. The CMS stops saving, and the only person who finds out is whoever tried`,
      });
      continue;
    }

    const admin = rules[adminAt]!;
    const detachAt = admin.lines.findIndex(
      (line) => line.replace(/\s+/g, ' ').trim() === DETACH_CSP,
    );
    const policyAt = admin.lines.findIndex((line) =>
      /^content-security-policy\s*:/i.test(line.trim()),
    );

    if (adminAt < siteAt) {
      violations.push({
        rule: 'headers',
        detail: `${path} declares \`${adminPath}\` before \`/*\`. A \`${DETACH_CSP}\` only removes what an earlier rule has already added, so in this order the editing desk detaches nothing and then has the site's policy appended after its own`,
      });
    }

    if (policyAt === -1) continue;

    if (detachAt === -1) {
      violations.push({
        rule: 'headers',
        detail: `${path}: \`${adminPath}\` declares a \`Content-Security-Policy\` and no \`${DETACH_CSP}\` above it. Both rules match that path and Cloudflare joins a header named twice with a comma — which in a CSP means two policies enforced at once, so the site's \`default-src 'self'\` goes on forbidding \`api.github.com\` however wide this row is. The CMS stops saving, and nothing here fails`,
      });
    } else if (detachAt > policyAt) {
      /* The half the sentence above always claimed and this never read. What a
         detach removes when it comes *after* the header its own rule has just
         set is not something Cloudflare documents — the desk is then served
         either two policies or none, and which one is found out in production.
         Written above, there is nothing to find out. */
      violations.push({
        rule: 'headers',
        detail: `${path}: \`${adminPath}\` writes \`${DETACH_CSP}\` below the \`Content-Security-Policy\` of its own rule, and it belongs above. Cloudflare documents the \`!\` as removing «a header which has been added by a more pervasive rule» and says nothing about one added by this one: in this order the editing desk is served either both policies or neither, and which of the two is a question answered in production`,
      });
    }
  }

  return violations;
}

/**
 * Every `style="…"` a page publishes is actually allowed to apply.
 *
 * **This is the guard that was not there**, and the defect it exists for was
 * shipped: `style-src 'self' 'sha256-…'` looks like it covers the inline styles
 * of a page, and it does not cover the *attributes* — those are `style-src-attr`
 * and they need `'unsafe-hashes'`, which a hash list alone does not imply. This
 * design system passes its sizes that way: `Brand` writes `--brand-height: 14px`,
 * `GuestRow` `--guest-size`, `EpisodeBadge` and `SignatureBand` their own.
 *
 * Blocked, an attribute does not fail — the custom property simply falls back to
 * the default in the component's stylesheet, and the element renders at another
 * size. The header of this site went out at twice its height, with a green
 * build, every guard passing, and the markup correct. It was found by a person
 * looking at two deployments side by side.
 *
 * So the question this asks is not «is there a hash» but «would a browser apply
 * it», which is the only question the last one should have been asking either.
 */
export function checkStyleAttributes(
  html: string,
  headers: string,
  path = 'the page',
): Violation[] {
  const site = headerRules(headers).find((rule) => rule.path === '/*');
  const policy = headerValue(site, 'Content-Security-Policy') ?? '';
  const governing = directive(policy, 'style-src-attr', ['style-src', 'default-src']);

  /* No policy at all governing them is not this guard's business: the pages are
     then unrestricted, and checkHeaderPolicy is what notices the missing CSP. */
  if (governing === '') return [];
  if (governing.includes("'unsafe-inline'")) return [];

  const attributes = [...new Set(styleAttributes(html))];
  const hashed = governing.includes("'unsafe-hashes'");

  return attributes
    .filter((value) => !(hashed && governing.includes(hashSource(sha256(value)))))
    .map((value) => ({
      rule: 'headers',
      detail: `${path} publishes \`style="${value}"\` and the policy does not let it apply: \`${governing}\` governs style attributes, and ${hashed ? 'its hash is not among the ones listed' : "a hash list covers `<style>` elements, not attributes — those need `'unsafe-hashes'`"}. Nothing fails. The declaration is dropped, the custom property falls back to the default in the stylesheet, and the element is published at another size`,
    }));
}

/** A file the browser fetches because a stylesheet named it: `url(…)` with an
 *  absolute address. Relative ones are `'self'` and say nothing. */
const FETCHED_URL = /url\(\s*["']?(https?:\/\/[^"')\s]+)/gi;

/** The extensions a browser asks `font-src` about. Everything else a stylesheet
 *  fetches by URL is an image, which is `img-src`. */
const FONT_FILE = /\.(?:woff2?|ttf|otf|eot)(?:[?#]|$)/i;

export function fetchedUrls(bundle: string): string[] {
  return [...new Set([...bundle.matchAll(FETCHED_URL)].map((match) => match[1] ?? ''))];
}

/** The scheme and host of an address, which is the granularity a CSP source
 *  list works at. */
export function originOf(url: string): string {
  return /^https?:\/\/[^/]+/.exec(url)?.[0] ?? '';
}

/**
 * The editing desk is allowed to fetch what its own bundle asks for.
 *
 * **This is the guard for the widening nobody writes**, and it is the mirror of
 * every other check here: those ask whether the policy still covers what *we*
 * publish, and this asks whether it covers what a dependency we do not build
 * fetches at runtime. Sveltia ships its own `@font-face` rules pointing at
 * jsdelivr — three faces, one of them Material Symbols — and the bundle is
 * gitignored and replaced by `npm run cms:sync` at every install, so a fourth
 * origin can arrive in a version bump with nothing in a diff to read.
 *
 * Blocked, none of it fails. The desk renders, the desk saves, and Material
 * Symbols being a **ligature** font, every control publishes its own ligature
 * where its icon should be: `edit`, `delete`, `chevron_right`. It is the shape
 * this whole file exists for — a policy that is right about everything a test
 * was written for and wrong in front of a volunteer.
 */
export function checkAdminFetchSources(
  bundle: string,
  headers: string,
  path = 'dist/_headers',
): Violation[] {
  const rules = headerRules(headers).filter((rule) => ADMIN_PATHS.includes(rule.path));
  const violations: Violation[] = [];
  const reported = new Set<string>();

  for (const rule of rules) {
    /* A row with no policy at all is checkHeaderPolicy's business, and saying it
       twice is how a report stops being read. */
    const policy = headerValue(rule, 'Content-Security-Policy');
    if (policy === undefined) continue;

    for (const url of fetchedUrls(bundle)) {
      const origin = originOf(url);
      const font = FONT_FILE.test(url);
      const name = font ? 'font-src' : 'img-src';
      const governing = directive(policy, name, ['default-src']);

      if (governing.includes(origin)) continue;

      const key = `${rule.path} ${name} ${origin}`;
      if (reported.has(key)) continue;
      reported.add(key);

      violations.push({
        rule: 'headers',
        detail: `${path}: the CMS bundle fetches \`${url}\` and \`${rule.path}\` does not allow it — \`${governing === '' ? 'nothing' : governing}\` is what governs it. ${
          font
            ? 'Nothing fails: the desk renders and goes on saving, and the face falls back. Material Symbols is a ligature font, so a blocked one publishes the name of every icon in place of the icon — `edit`, `delete`, `chevron_right`'
            : 'Nothing fails: the desk renders and goes on saving, with that image missing wherever it was meant to be'
        }. Add \`${origin}\` to \`${name}\` in ADMIN_POLICY, with what needs it written beside it`,
      });
    }
  }

  return violations;
}

/** Throwaway: a guard no test covers, to see whether a red shard stops a merge.
 *  Removed as soon as the answer is in. */
export function checkFettaRossa(value: string): Violation[] {
  return value === 'mai' ? [{ rule: 'headers', detail: 'mai' }] : [];
}
