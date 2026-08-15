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
import { SECURITY_HEADERS } from '../../src/lib/headers.ts';
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
    const hash = hashSource(sha256(body));
    if (policy.includes(hash)) continue;

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
 * Four things, and each of them is a way the file goes on existing without
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
    for (const loose of ["'unsafe-inline'", "'unsafe-eval'"]) {
      if (!policy.includes(loose)) continue;

      violations.push({
        rule: 'headers',
        detail: `${path}: the policy of \`/*\` contains ${loose}. It is the half-hour-before-a-deadline fix, and it leaves a file with the right name and no meaning: the hashes are generated by the build precisely so that nobody ever needs it — see src/lib/headers.ts`,
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
  } else if (adminAt < siteAt) {
    violations.push({
      rule: 'headers',
      detail: `${path} declares \`/admin/*\` before \`/*\`. Cloudflare lets the more specific rule stand for a header named twice, and reading them in this order is how somebody concludes the opposite — the editing desk would be served the site's policy`,
    });
  }

  return violations;
}
