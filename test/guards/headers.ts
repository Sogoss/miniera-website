/* Two guards over the file the build writes for Cloudflare, and they ask the
 * two different questions a generated policy can fail.
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
 */
import { createHash } from 'node:crypto';
import { hashSource, inlineScripts, inlineStyles } from '../../src/lib/headers.ts';
import { DETACH_CSP, SECURITY_HEADERS } from '../../src/lib/headers.ts';
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
  const adminAt = rules.findIndex((rule) => rule.path === '/admin/*');

  if (adminAt === -1) {
    violations.push({
      rule: 'headers',
      detail: `${path} has no \`/admin/*\` rule: the editing desk takes the site's policy, which forbids everything Sveltia needs. The CMS stops saving, and the only person who finds out is whoever tried`,
    });
  } else {
    const admin = rules[adminAt]!;
    const detaches = admin.lines.some((line) => line.replace(/\s+/g, ' ').trim() === DETACH_CSP);

    if (adminAt < siteAt) {
      violations.push({
        rule: 'headers',
        detail: `${path} declares \`/admin/*\` before \`/*\`. A \`${DETACH_CSP}\` only removes what an earlier rule has already added, so in this order the editing desk detaches nothing and then has the site's policy appended after its own`,
      });
    }

    if (headerValue(admin, 'Content-Security-Policy') !== undefined && !detaches) {
      violations.push({
        rule: 'headers',
        detail: `${path}: \`/admin/*\` declares a \`Content-Security-Policy\` and no \`${DETACH_CSP}\` above it. Both rules match that path and Cloudflare joins a header named twice with a comma — which in a CSP means two policies enforced at once, so the site's \`default-src 'self'\` goes on forbidding \`api.github.com\` however wide this row is. The CMS stops saving, and nothing here fails`,
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
