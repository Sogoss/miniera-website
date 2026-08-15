/* The response headers Cloudflare Pages sends, generated rather than written.
 *
 * Same family as cycles.ts and shapes.ts: a file the build emits, built by a
 * pure function so that a test can ask what it says without running a build.
 * What makes it belong here rather than in scripts/ is that the answer depends
 * on the site — on what the pages actually contain — and not on how the site is
 * assembled.
 *
 * **Why it cannot be written by hand.** This site publishes nine pages and not
 * one external script: every line of JavaScript it runs is `is:inline`, by four
 * separate decisions that all had good reasons — the class that comes off
 * <html> before anything is painted, the modal, the two of the scroller — plus
 * the `<style is:inline>` of CycleAccents and whatever Astro decides to inline.
 * A Content-Security-Policy that reaches them has two forms: `'unsafe-inline'`,
 * which is a policy written to pass, or hashes, which are exact. Hashes change
 * every time one of those lines changes, and a hash written by hand in a file
 * nobody rebuilds is right the day it is written and wrong the first day
 * somebody edits a script — with no test, no build failure and no sign at all,
 * because the page still renders. What sees it is a visitor with the console
 * open.
 *
 * **And they are taken from dist/, not from the source.** What a browser hashes
 * is the bytes it received, and between the two there is `compressHTML` and
 * whatever else the build does to a document. It is the same lesson as the
 * collapsed CSS fallback, in a third disguise.
 *
 * `/admin` gets its own, wider and declared. It is the one place here where a
 * policy does real work — JavaScript with write access to the repository — and
 * also the one place where a policy that is too tight breaks something in a way
 * only a person can notice: the CMS refusing to save. Every relaxation on that
 * row is written with what needs it.
 */

/** A `<script>` with no `src`: the browser runs its body, so the body is what
 *  a hash has to cover. `[^>]*` never crosses the `>`, so an attribute cannot
 *  swallow the tag. */
const INLINE_SCRIPT = /<script\b(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script\s*>/gi;

const INLINE_STYLE = /<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi;

/** Exactly the bytes between the tags, which is what the browser hashes: not
 *  trimmed, not normalised. A hash of something tidier is a hash of nothing. */
function bodies(html: string, pattern: RegExp): string[] {
  return [...html.matchAll(pattern)].map((match) => match[1] ?? '');
}

export function inlineScripts(html: string): string[] {
  return bodies(html, INLINE_SCRIPT);
}

export function inlineStyles(html: string): string[] {
  return bodies(html, INLINE_STYLE);
}

/** A CSP source expression for a base64 SHA-256 digest. */
export function hashSource(digestBase64: string): string {
  return `'sha256-${digestBase64}'`;
}

/**
 * The policy for the site itself.
 *
 * `'self'` stays on `script-src` beside the hashes even though there is no
 * external script today: the moment a component drops `is:inline` Astro emits
 * `/_astro/….js`, and a policy that breaks on an ordinary change is a policy
 * somebody replaces with `'unsafe-inline'` in a hurry.
 *
 * Only what differs from `default-src` is spelled out. `frame-ancestors` is the
 * modern half of the `X-Frame-Options` beside it; both are sent because the
 * browser floor of this project reaches back to Safari 15.4.
 */
export function sitePolicy(scripts: readonly string[]): string {
  return [
    "default-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src 'self' ${scripts.join(' ')}`.trimEnd(),
    STYLE_SRC,
  ].join('; ');
}

/**
 * Styles are `'unsafe-inline'`, deliberately, and this is the second thing this
 * file exists to explain.
 *
 * It was hashes, like the scripts, and that shipped a site whose header was
 * twice its proper height. **A hash in `style-src` covers a `<style>` element
 * and not a `style` attribute** — those are `style-src-attr`, and they need
 * `'unsafe-hashes'` — and this design system passes sizes as custom properties
 * in exactly that way: `Brand` writes `--brand-height: 14px`, `GuestRow`
 * `--guest-size`, `EpisodeBadge` and `SignatureBand` their own. Blocked, every
 * one of them fell back to the default in its stylesheet, and the page rendered
 * perfectly at the wrong size with a green build behind it.
 *
 * Two ways out, and the tighter one is worse here. `'unsafe-hashes'` with the
 * hash of every attribute value would keep the policy exact — the generator
 * already reads dist/, so collecting them is a few lines — but it is understood
 * by browsers from Safari 15.4, which is exactly this project's floor, and a
 * browser that does not understand it **silently reproduces the bug we just
 * shipped**. That is the failure mode this whole file is written against, and
 * paying for it in exchange for a stricter style policy is the wrong trade: an
 * attacker who cannot inject a script cannot reach these attributes either, and
 * `script-src` is where the value is and stays exact.
 *
 * `'unsafe-inline'` and hashes cannot both apply: the presence of a hash makes
 * a browser ignore `'unsafe-inline'`. So the element hashes come out with it,
 * and `checkStyleAttributes` is what stops this from drifting back.
 */
const STYLE_SRC = "style-src 'self' 'unsafe-inline'";

/**
 * The policy for the editing desk, which is not a page of this site.
 *
 * Every widening is here with the thing that needs it, and this is the row the
 * manual test of PR 17 exercises: a policy that is too tight does not fail a
 * build, it fails a save — and the person it fails is a volunteer who has been
 * told the form is all there is.
 */
export const ADMIN_POLICY = [
  "default-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  // Sveltia is a compiled application that writes its own styles as it renders.
  // There is no build of ours to take a hash from.
  "style-src 'self' 'unsafe-inline'",
  // The bundle is served by us out of public/admin/ — see scripts/sync-cms.mjs
  // for why it is not a CDN.
  "script-src 'self'",
  // The GitHub API is the backend: this is the line that lets an editor save.
  // raw.githubusercontent.com is where it reads media back from the repository.
  "connect-src 'self' https://api.github.com https://raw.githubusercontent.com",
  // A photograph being uploaded is previewed from a blob: URL before it is
  // anywhere, and avatars come from GitHub.
  "img-src 'self' data: blob: https://avatars.githubusercontent.com",
].join('; ');

/** Headers every response carries, whatever it is. */
export const SECURITY_HEADERS: readonly (readonly [string, string])[] = [
  // A .txt served as text/html is the whole of the sniffing problem.
  ['X-Content-Type-Options', 'nosniff'],
  // The path of a page is not the business of the site it links to; the origin
  // is, because that is how a referral is recognised as one.
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  ['X-Frame-Options', 'DENY'],
  // Nothing here asks for any of them, and a page that never asks is the
  // cheapest place to say no.
  ['Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()'],
];

/** The line that takes a header back off, in Cloudflare's syntax: the name with
 *  `! ` in front of it. Exported because the guard asks for it by name, and a
 *  string spelled twice is a string that can be spelled two ways. */
export const DETACH_CSP = '! Content-Security-Policy';

/**
 * The whole `_headers` file.
 *
 * **Two matching rules do not override each other — they add up.** Cloudflare
 * applies every rule whose pattern matches, and «if a header is applied twice
 * the values are joined with a comma separator»: `/admin/*` matches `/admin/*`
 * *and* `/*`, so the editing desk would be sent both policies in one header. A
 * comma in a `Content-Security-Policy` is not a list of sources, it is a list of
 * **policies**, and a browser enforces all of them at once — so the site's
 * `default-src 'self'`, which names no `connect-src`, would go on forbidding
 * `api.github.com` however wide the row underneath it was written. The CMS would
 * not save, which is the one failure this whole file is arranged to prevent, and
 * the only person who would find out is whoever tried.
 *
 * So the row takes the site's policy **off** before declaring its own, with the
 * `!` Cloudflare documents for exactly this — «remove a header which has been
 * added by a more pervasive rule». The order still matters, and now for a reason
 * that is true: a detach only removes what an earlier rule has already added, so
 * `/admin/*` written above `/*` would detach nothing and then have the site's
 * policy appended after it. `checkHeaderPolicy` holds both halves.
 *
 * No `Strict-Transport-Security`. It is a promise with a long expiry, made on
 * an address this project abandons at PR 20; it arrives with the domain, in the
 * step that has one to make it about.
 */
export function headersFile(scripts: readonly string[]): string {
  const lines = [
    '# Generated by the astro:build:done hook in astro.config.mjs — see',
    '# src/lib/headers.ts. Editing this file by hand lasts until the next build.',
    '',
    '/*',
    ...SECURITY_HEADERS.map(([name, value]) => `  ${name}: ${value}`),
    `  Content-Security-Policy: ${sitePolicy(scripts)}`,
    '',
    '/admin/*',
    /* Both rules match this path and Cloudflare joins what they say. Without
       this line the editing desk is governed by the site's policy as well as
       its own, and stops talking to GitHub. */
    `  ${DETACH_CSP}`,
    `  Content-Security-Policy: ${ADMIN_POLICY}`,
    '',
  ];

  return lines.join('\n');
}
