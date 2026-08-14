/* The voices of the site, and which one the reader is standing in.
 *
 * A list of four in a module of its own rather than four lines of markup in the
 * component, for the reason every expectation in this suite is derived: the
 * build assertions ask «does every page publish the navigation the site
 * declares», and a copy of the list written in a test answers a question about
 * the test. Here it is one fact, read by the component and by what checks it.
 *
 * Pure, like the other four modules of src/lib: no imports, no clock, nothing
 * from astro:content. The navigation is configuration, not content — it is not
 * a collection for the same reason the telephone number is not one.
 */

export type NavItem = {
  label: string;
  /** Where it leads — absent when the section is announced and not built. */
  href?: string;
  /** What is said beside a voice that leads nowhere yet. */
  note?: string;
};

/**
 * The four voices, in the order of the design.
 *
 * «Rassegna stampa» carries no `href`, and that is the whole of the decision:
 * there is no page, so there is nothing to link to. Written as an `<a>` with no
 * address it would look like the others and be none of them — not focusable,
 * not announced as a link, and a voice that a reader tries once. It is text
 * with its note beside it, and the day the press review becomes a page it gets
 * an `href` here and nowhere else.
 */
export const NAVIGATION: readonly NavItem[] = [
  { label: 'Programma', href: '/' },
  { label: 'Rassegna stampa', note: 'in arrivo' },
  { label: 'Chi siamo', href: '/chi-siamo' },
  { label: 'Contatti', href: '/contatti' },
];

/** A path as this module compares them: leading slash, no trailing one. */
function normalise(pathname: string): string {
  const trimmed = (pathname || '/').trim().split(/[?#]/)[0] ?? '/';
  const rooted = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const bare = rooted.replace(/\/+$/, '');
  return bare === '' ? '/' : bare;
}

/**
 * The voice a given path is standing in, or nothing.
 *
 * Two things it has to know that a string comparison does not.
 *
 * **An evening is the programme.** `/81` is not a page of its own — it is the
 * scroller opened on the eighty-first evening — so the voice that is current
 * there is «Programma». Marking none would publish eighty-one pages on which
 * the navigation says the reader is nowhere.
 *
 * **A path may or may not end in a slash.** Astro's default build format writes
 * `/chi-siamo/index.html`, so `Astro.url.pathname` is `/chi-siamo/` in the
 * build and `/chi-siamo` is what a person types. Compared literally, one of the
 * two marks nothing — and which one depends on a configuration value nobody
 * would connect to a missing highlight.
 *
 * The gallery at `/componenti` is deliberately in no voice: it is a service
 * page, out of the index and out of the navigation, and «at most one voice is
 * current» is what the build assertions ask for that reason.
 */
export function currentHref(pathname: string): string | undefined {
  const path = normalise(pathname);

  /* Only digits, which is exactly what src/pages/[number].astro publishes:
     the editorial number of an evening, nothing else. */
  const wanted = /^\/\d+$/.test(path) ? '/' : path;

  return NAVIGATION.find((item) => item.href !== undefined && item.href === wanted)?.href;
}
