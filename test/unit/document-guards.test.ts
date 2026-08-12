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
  checkDocumentBasics,
  checkOpenGraph,
  checkSkipLink,
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

const page = (head = HEAD, body = '<a href="#programma">Salta al programma</a><main id="programma"><h1>Programma</h1></main>') =>
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

  it('asks for og:url and og:image only once there is a domain', () => {
    // The whole point of the option: until `site` is set those two would be
    // relative URLs, which produce a preview with no picture while looking
    // perfectly fine in the markup.
    expect(checkOpenGraph(page(), 'dist/index.html')).toEqual([]);

    const missing = checkOpenGraph(page(), 'dist/index.html', { withDomain: true });
    expect(missing).toHaveLength(2);
    expect(missing.map((violation) => violation.detail).join(' ')).toContain('PR 13');
  });

  it('refuses a relative og:url even when one is present', () => {
    const relative =
      HEAD +
      '<meta property="og:url" content="/81"><meta property="og:image" content="/foto/81.jpg">';
    expect(checkOpenGraph(page(relative), 'dist/index.html', { withDomain: true })).toHaveLength(2);
  });

  it('accepts absolute ones', () => {
    const absolute =
      HEAD +
      '<meta property="og:url" content="https://www.laminieraculturale.it/81">' +
      '<meta property="og:image" content="https://www.laminieraculturale.it/foto/81.jpg">';
    expect(checkOpenGraph(page(absolute), 'dist/index.html', { withDomain: true })).toEqual([]);
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
    const body = '<nav><a href="/chi-siamo">Chi siamo</a></nav><a href="#programma">Salta</a><main id="programma"></main>';
    const violations = checkSkipLink(page(HEAD, body), 'dist/index.html');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('/chi-siamo');
  });

  it('reports a skip link pointing at an id that does not exist', () => {
    const body = '<a href="#programma">Salta</a><main id="contenuto"><h1>Programma</h1></main>';
    const violations = checkSkipLink(page(HEAD, body));
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('not an id in this page');
  });

  it('is not fooled by an id that merely starts the same way', () => {
    const body = '<a href="#programma">Salta</a><main id="programma-2"><h1>Programma</h1></main>';
    expect(checkSkipLink(page(HEAD, body))).toHaveLength(1);
  });
});
