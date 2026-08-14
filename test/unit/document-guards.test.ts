/* Negative tests for the guards over the published document.
 *
 * These are the invariants the base layout hands out for free, which is exactly
 * why they need guarding: nothing about a page written without the layout looks
 * wrong. It renders, it is readable, and it has lost the language a screen
 * reader announces, the preview a link produces, or the only way past the
 * navigation a keyboard has.
 */
import { describe, expect, it } from 'vitest';
import {
  checkAnchorsWithoutHref,
  checkDocumentBasics,
  checkOpenGraph,
  checkSkipLink,
  checkSkipLinkStyle,
  elementsWith,
} from '../guards/document.ts';

const HEAD =
  '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
  '<title>La Miniera Culturale in Periferia</title>' +
  '<meta name="description" content="Un locale che nessuno usava.">' +
  '<meta property="og:type" content="website">' +
  '<meta property="og:site_name" content="La Miniera Culturale in Periferia">' +
  '<meta property="og:locale" content="it_IT">' +
  '<meta property="og:title" content="La Miniera Culturale in Periferia">' +
  '<meta property="og:description" content="Un locale che nessuno usava.">' +
  '<meta name="twitter:card" content="summary">';

const BODY =
  '<a href="#programma">Salta al programma</a><main id="programma" tabindex="-1"><h1>Programma</h1></main>';

const page = (head = HEAD, body = BODY) =>
  `<!DOCTYPE html><html lang="it"><head>${head}</head><body>${body}</body></html>`;

describe('checkDocumentBasics', () => {
  it('accepts a page the layout produced', () => {
    expect(checkDocumentBasics(page(), 'dist/index.html')).toEqual([]);
  });

  it('reports a missing language and a wrong one', () => {
    expect(checkDocumentBasics(page().replace(' lang="it"', ''))).toHaveLength(1);
    const english = checkDocumentBasics(page().replace('lang="it"', 'lang="en"'));
    expect(english).toHaveLength(1);
    expect(english[0]!.detail).toContain('Italian');
  });

  it('reports a missing charset and a missing viewport', () => {
    expect(checkDocumentBasics(page(HEAD.replace(/<meta charset[^>]*>/, '')))).toHaveLength(1);
    expect(checkDocumentBasics(page(HEAD.replace(/<meta name="viewport"[^>]*>/, '')))).toHaveLength(1);
  });

  it('reports a page with no h1 and a page with two', () => {
    const none = checkDocumentBasics(page(HEAD, '<a href="#x"></a><main id="x"><h2>Serata</h2></main>'));
    expect(none).toHaveLength(1);
    expect(none[0]!.detail).toContain('no `<h1>`');

    const two = checkDocumentBasics(page(HEAD, '<main><h1>Uno</h1><h1>Due</h1></main>'));
    expect(two.some((violation) => violation.detail.includes('2 `<h1>`'))).toBe(true);
  });

  it('does not count an h1 left in a comment', () => {
    const commented = page(HEAD, '<main id="programma"><h1>Programma</h1><!-- <h1>vecchio</h1> --></main>');
    expect(checkDocumentBasics(commented)).toEqual([]);
  });

  it('does not count an h1 inside a script or a template', () => {
    // Astro ships script bodies verbatim. PR 7's scroller is the obvious
    // carrier of one, and `const t = "<h1>"` is not a heading.
    const scripted = page(HEAD, `${BODY}<script>const t = "<h1>x</h1>";</script>`);
    expect(checkDocumentBasics(scripted)).toEqual([]);

    const templated = page(HEAD, `${BODY}<template><h1>modello</h1></template>`);
    expect(checkDocumentBasics(templated)).toEqual([]);
  });

  it('does not accept xml:lang in place of lang', () => {
    // HTML parsers ignore it in text/html: the page would be read out in
    // whatever language the reader's system is set to.
    const xml = page().replace('<html lang="it">', '<html xml:lang="it">');
    const violations = checkDocumentBasics(xml);
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('xml:lang');
  });

  it('reads the viewport instead of only finding it', () => {
    const desktop = page(HEAD.replace('width=device-width, initial-scale=1', 'width=1024'));
    const violations = checkDocumentBasics(desktop);
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('width=device-width');

    expect(checkDocumentBasics(page(HEAD.replace(/<meta name="viewport"[^>]*>/, '<meta name="viewport">')))).toHaveLength(1);
  });

  it('reads a lang attribute whatever else the tag carries', () => {
    const decorated = page().replace('<html lang="it">', '<html data-astro-cid-x lang="it" class="x">');
    expect(checkDocumentBasics(decorated)).toEqual([]);
  });
});

describe('checkOpenGraph', () => {
  it('accepts the tags that need no domain', () => {
    expect(checkOpenGraph(page(), 'dist/index.html')).toEqual([]);
  });

  it('reports each missing tag by name', () => {
    const withoutTitle = checkOpenGraph(page(HEAD.replace(/<meta property="og:title"[^>]*>/, '')));
    expect(withoutTitle).toHaveLength(1);
    expect(withoutTitle[0]!.detail).toContain('og:title');

    const withoutDescription = checkOpenGraph(page(HEAD.replace(/<meta name="description"[^>]*>/, '')));
    expect(withoutDescription[0]!.detail).toContain('description');
  });

  it('reports a tag that is there but empty', () => {
    expect(checkOpenGraph(page(HEAD.replace('content="website"', 'content=""')))).toHaveLength(1);
  });

  it('reports an empty or missing title', () => {
    expect(checkOpenGraph(page(HEAD.replace(/<title>[^<]*<\/title>/, '<title></title>')))).toHaveLength(1);
  });

  it('asks for og:url only once there is a domain', () => {
    // Until `site` is set an og:url would be relative, which produces a preview
    // with no picture while looking perfectly fine in the markup.
    expect(checkOpenGraph(page(), 'dist/index.html')).toEqual([]);

    const missing = checkOpenGraph(page(), 'dist/index.html', { withDomain: true });
    expect(missing).toHaveLength(1);
    expect(missing[0]!.detail).toContain('PR 16');
  });

  it('does not ask for an og:image the repository has no picture for', () => {
    // Requiring it with the domain would open PR 16 on a red suite fixable only
    // by inventing a social image nobody has chosen — the decision is in
    // questioni-aperte.md, not in a failing test.
    const violations = checkOpenGraph(page(), 'dist/index.html', { withDomain: true });
    expect(violations.map((violation) => violation.detail).join(' ')).not.toContain('og:image');
  });

  it('refuses a relative og:url and a relative og:image', () => {
    const relative =
      HEAD +
      '<meta property="og:url" content="/81"><meta property="og:image" content="/foto/81.jpg">';
    const violations = checkOpenGraph(page(relative), 'dist/index.html', { withDomain: true });
    expect(violations).toHaveLength(2);
    expect(violations.map((violation) => violation.detail).join(' ')).toContain('og:image');
  });

  it('accepts absolute ones', () => {
    const absolute =
      HEAD +
      '<meta property="og:url" content="https://www.laminieraculturale.it/81">' +
      '<meta property="og:image" content="https://www.laminieraculturale.it/foto/81.jpg">';
    expect(checkOpenGraph(page(absolute), 'dist/index.html', { withDomain: true })).toEqual([]);
  });

  it('reads a meta whose attributes are in the other order', () => {
    // `<meta content="…" property="og:title">` is the same tag. Reporting it as
    // missing would fail the build over something that is right there in
    // dist/index.html, and send whoever reads CI looking for it.
    const reordered = HEAD.replace(
      '<meta property="og:title" content="La Miniera Culturale in Periferia">',
      '<meta content="La Miniera Culturale in Periferia" property="og:title">',
    );
    expect(checkOpenGraph(page(reordered), 'dist/index.html')).toEqual([]);
  });
});

describe('checkSkipLink', () => {
  it('accepts a skip link that comes first and lands somewhere', () => {
    expect(checkSkipLink(page(), 'dist/index.html')).toEqual([]);
  });

  it('reports a page with no links at all', () => {
    expect(checkSkipLink(page(HEAD, '<main id="programma"><h1>Programma</h1></main>'))).toHaveLength(1);
  });

  it('reports a link that comes before the skip link', () => {
    // A skip link reached after the navigation has skipped nothing.
    const body = '<nav><a href="/chi-siamo">Chi siamo</a></nav><a href="#programma">Salta</a><main id="programma" tabindex="-1"></main>';
    const violations = checkSkipLink(page(HEAD, body), 'dist/index.html');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('/chi-siamo');
  });

  it('reports anything focusable that comes before it, not only a link', () => {
    // The navigation of the design is made of `<button type="button">` — brand,
    // filters, arrows — and sits above the skip link in the DOM. Looking only
    // for the first `<a>` left the guard blind to exactly the markup it exists
    // for: the first Tab stop was a button and it said nothing.
    const nav = '<nav><button type="button">Menu</button></nav><a href="#programma">Salta</a><main id="programma" tabindex="-1"></main>';
    const violations = checkSkipLink(page(HEAD, nav), 'dist/index.html');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('button');

    const field = '<input type="search"><a href="#programma">Salta</a><main id="programma" tabindex="-1"></main>';
    expect(checkSkipLink(page(HEAD, field))).toHaveLength(1);

    const grabbed = '<div tabindex="0">Prima</div><a href="#programma">Salta</a><main id="programma" tabindex="-1"></main>';
    expect(checkSkipLink(page(HEAD, grabbed))).toHaveLength(1);
  });

  it('is not bothered by something that cannot take focus', () => {
    const before = '<p>Un paragrafo</p><input type="hidden" name="x"><a href="#programma">Salta</a><main id="programma" tabindex="-1"></main>';
    expect(checkSkipLink(page(HEAD, before))).toEqual([]);
  });

  it('reports a skip link pointing at an id that does not exist', () => {
    const body = '<a href="#programma">Salta</a><main id="contenuto" tabindex="-1"><h1>Programma</h1></main>';
    const violations = checkSkipLink(page(HEAD, body));
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('not an `id` in this page');
  });

  it('is not fooled by an id that merely starts the same way', () => {
    const body = '<a href="#programma">Salta</a><main id="programma-2" tabindex="-1"><h1>Programma</h1></main>';
    expect(checkSkipLink(page(HEAD, body))).toHaveLength(1);
  });

  it('is not fooled by a data-id either', () => {
    // The project writes data-number, data-state, data-open and data-cycle on
    // every evening: `data-id` is a plausible thing for a scroller to carry,
    // and `\b` before `id` accepted it.
    const body = '<a href="#programma">Salta</a><main data-id="programma"><h1>Programma</h1></main>';
    const violations = checkSkipLink(page(HEAD, body));
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('data-id');
  });

  it('reports a target that cannot take focus', () => {
    // Without tabindex="-1" Chrome and Safari scroll there and leave the focus
    // on the link, so the next Tab walks back into the navigation — the defect
    // the attribute exists to prevent, and nothing was checking for it.
    const body = '<a href="#programma">Salta</a><main id="programma"><h1>Programma</h1></main>';
    const violations = checkSkipLink(page(HEAD, body));
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('tabindex="-1"');
  });

  it('accepts a target that is focusable on its own terms', () => {
    const body = '<a href="#salta">Salta</a><button id="salta">Programma</button><h1>Programma</h1>';
    expect(checkSkipLink(page(HEAD, body))).toEqual([]);
  });

  it('reads a page that never opens a body', () => {
    // `<body>` is optional in HTML5, and a page written without the layout is
    // exactly what this guard is for. The search used to return -1 and the
    // slice then looked at the last character of the document.
    const bodyless = '<html lang="it"><a href="#programma">Salta</a><main id="programma" tabindex="-1"><h1>P</h1></main></html>';
    expect(checkSkipLink(bodyless)).toEqual([]);
  });
});

describe('checkSkipLinkStyle', () => {
  const published =
    '.skip-link{position:absolute;transform:translateY(calc(-100% - 16px))}' +
    '.skip-link:focus{transform:translateY(0)}';

  it('accepts a link that is hidden and revealed on focus', () => {
    expect(checkSkipLinkStyle(published, 'dist/')).toEqual([]);
  });

  it('reports a link nothing hides', () => {
    const violations = checkSkipLinkStyle('.skip-link:focus{transform:translateY(0)}', 'dist/');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('visible to everyone');
  });

  it('reports a link nothing brings back', () => {
    // The worse half: a keyboard tabs onto something nobody can see.
    const violations = checkSkipLinkStyle('.skip-link{transform:translateY(-200%)}', 'dist/');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('back into view');
  });

  it('reports a stylesheet that lost the rule entirely', () => {
    expect(checkSkipLinkStyle('body{margin:0}', 'dist/')).toHaveLength(1);
  });

  it('reads the scoped form Astro publishes', () => {
    const scoped =
      '.skip-link[data-astro-cid-hkbrpulz]{transform:translateY(calc(-100% - 16px))}' +
      '.skip-link[data-astro-cid-hkbrpulz]:focus{transform:translateY(0)}';
    expect(checkSkipLinkStyle(scoped, 'dist/')).toEqual([]);
  });
});

/* An `<a>` with no address, which is the shape a voice that leads nowhere
   takes when somebody writes it as a link anyway. It looks like the links
   beside it, and it is not one: no focus, no announcement, no Enter. */
describe('checkAnchorsWithoutHref', () => {
  it('accepts a navigation whose voices are links and whose text is text', () => {
    const nav =
      '<nav><a href="/">Programma</a><span data-soon>Rassegna stampa</span></nav>';
    expect(checkAnchorsWithoutHref(nav, 'dist/index.html')).toEqual([]);
  });

  it('reports the voice written as a link with the address left off', () => {
    const nav = '<nav><a href="/">Programma</a><a data-soon>Rassegna stampa</a></nav>';
    const violations = checkAnchorsWithoutHref(nav, 'dist/index.html');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('data-soon');
  });

  it('is not fooled by an attribute that merely ends in href', () => {
    // `data-href` is a string somebody's script reads, not an address a
    // browser follows, and this is the anchor with nothing behind it.
    expect(checkAnchorsWithoutHref('<a data-href="/rassegna">Rassegna</a>')).toHaveLength(1);
  });

  it('reads inside a template, where the modal takes its content from', () => {
    // A dead link in a <template> is a dead link in the panel it fills.
    const template = '<template id="booking-81"><a class="button">Prenota</a></template>';
    expect(checkAnchorsWithoutHref(template)).toHaveLength(1);
  });

  it('leaves a script alone, where an `<a>` is a string', () => {
    const script = '<script>const html = "<a>" + label + "</a>";</script>';
    expect(checkAnchorsWithoutHref(script)).toEqual([]);
  });

  it('leaves alone a link commented out and the old named anchor', () => {
    expect(checkAnchorsWithoutHref('<!-- <a>presto</a> -->')).toEqual([]);
    expect(checkAnchorsWithoutHref('<a name="alto"></a>')).toEqual([]);
  });

  it('accepts the one anchor with no address that says why', () => {
    // `Button` renders a disabled link this way, decided at PR 6: without href
    // it is out of the tab order, `role="link"` gives it back the role an
    // anchor with no address loses, and `aria-disabled` is what makes it
    // announced as off rather than merely inert. It is in the gallery, which is
    // where this guard met it.
    const off = '<a role="link" aria-disabled="true" class="button">Prenota</a>';
    expect(checkAnchorsWithoutHref(off, 'dist/componenti/index.html')).toEqual([]);
  });

  it('reports each half of that on its own', () => {
    // `aria-disabled` alone is the export's version, which PR 6 took out: on an
    // element with the generic role the attribute qualifies nothing, so a
    // screen reader says neither that it is a link nor that it is off. And
    // `role="link"` alone is a link that announces itself and does nothing.
    expect(checkAnchorsWithoutHref('<a aria-disabled="true">Prenota</a>')).toHaveLength(1);
    expect(checkAnchorsWithoutHref('<a role="link">Prenota</a>')).toHaveLength(1);
    expect(
      checkAnchorsWithoutHref('<a role="link" aria-disabled="false">Prenota</a>'),
    ).toHaveLength(1);
  });
});

/* The scanner both the brand guard and the placeholder guard read the page
   with. Its two failure modes are the ones that made it a shared function:
   stopping at the first closing tag, which reads the first child instead of
   the element, and never stopping at all on an element that has no closing tag
   — which is how `<img data-brand>` once borrowed the signature of a band
   further down the page. */
describe('elementsWith', () => {
  it('spans an element that contains elements of the same name', () => {
    const markup = '<div data-x><div>uno</div><div>due</div></div><p>fuori</p>';
    const [found] = elementsWith(markup, 'data-x');
    expect(markup.slice(found!.from, found!.to)).toBe('<div>uno</div><div>due</div>');
  });

  it('gives a void element an empty span instead of the rest of the document', () => {
    const markup = '<img data-x><p>fuori</p>';
    const [found] = elementsWith(markup, 'data-x');
    expect(found!.from).toBe(found!.to);
  });

  it('reads the attribute however it is written, and not one that contains it', () => {
    expect(elementsWith('<div data-x>a</div>', 'data-x')).toHaveLength(1);
    expect(elementsWith('<div data-x="true">a</div>', 'data-x')).toHaveLength(1);
    expect(elementsWith('<div data-xyz>a</div>', 'data-x')).toEqual([]);
  });
});
