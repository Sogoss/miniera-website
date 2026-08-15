/* The four voices, and which one a page is standing in.
 *
 * Both questions are one-liners and both have a way of being wrong that no page
 * shows: a navigation where nothing is marked reads as «you are nowhere», and
 * one where the wrong voice is marked reads as a page the reader is not on.
 * Neither fails, neither is visible in a screenshot of the right page.
 */
import { describe, expect, it } from 'vitest';
import { NAVIGATION, currentHref } from '../../src/lib/navigation.ts';

describe('NAVIGATION', () => {
  it('names the four voices of the design, in its order', () => {
    expect(NAVIGATION.map((item) => item.label)).toEqual([
      'Programma',
      'Rassegna stampa',
      'Chi siamo',
      'Contatti',
    ]);
  });

  it('leaves «Rassegna stampa» without an address, and says why beside it', () => {
    // There is no page: an `<a>` with no href is not a link, and a page at
    // /rassegna would be an indexable address with nothing to say.
    const press = NAVIGATION.find((item) => item.label === 'Rassegna stampa');
    expect(press?.href).toBeUndefined();
    expect(press?.note).toBeTruthy();
  });

  it('gives every other voice an address and no note', () => {
    for (const item of NAVIGATION.filter((voice) => voice.label !== 'Rassegna stampa')) {
      expect(item.href, `«${item.label}» leads nowhere`).toMatch(/^\//);
      expect(item.note).toBeUndefined();
    }
  });
});

describe('currentHref', () => {
  it('marks the voice whose page is being read', () => {
    expect(currentHref('/chi-siamo')).toBe('/chi-siamo');
    expect(currentHref('/contatti')).toBe('/contatti');
    expect(currentHref('/')).toBe('/');
  });

  it('does not mind the trailing slash a build writes', () => {
    // Astro's default build format publishes /chi-siamo/index.html, so the
    // pathname in a build has the slash and what a person types does not.
    // Compared literally, one of the two marks nothing — and which one depends
    // on a configuration value nobody would connect to a missing highlight.
    expect(currentHref('/chi-siamo/')).toBe('/chi-siamo');
    expect(currentHref('/contatti///')).toBe('/contatti');
  });

  it('reads an evening as the programme', () => {
    // /81 is not a page of its own: it is the scroller opened on the
    // eighty-first evening. Marked as nothing, eighty-one pages would publish a
    // navigation saying the reader is nowhere.
    expect(currentHref('/81')).toBe('/');
    expect(currentHref('/78/')).toBe('/');
  });

  it('does not read the 404 as an evening', () => {
    // `/404` is all digits and is not an evening, and it is the only address
    // that is both. Left to the digit rule it marks «Programma», so the page a
    // wrong address lands on tells the reader they are standing in the
    // programme — which is the opposite of what has just happened to them.
    //
    // Found by the build assertions on PR 17, the day the 404 existed: no unit
    // test could have asked this before there was a page at that address.
    expect(currentHref('/404')).toBeUndefined();
    expect(currentHref('/404/')).toBeUndefined();
  });

  it('still reads a number that only resembles the 404 as an evening', () => {
    // The reservation is that one address, not a shape. `/4040` is an evening
    // this association will never reach, and `/40` is one it already passed.
    expect(currentHref('/4040')).toBe('/');
    expect(currentHref('/40')).toBe('/');
  });

  it('marks nothing on a page that is in no voice', () => {
    // The gallery is a service page, out of the index and out of the
    // navigation. «At most one voice is current» is the assertion, and this is
    // the case it is written for.
    expect(currentHref('/componenti')).toBeUndefined();
    expect(currentHref('/rassegna')).toBeUndefined();
  });

  it('is not fooled by a path that only looks like a voice', () => {
    expect(currentHref('/chi-siamo-noi')).toBeUndefined();
    expect(currentHref('/chi-siamo/persone')).toBeUndefined();
    expect(currentHref('/81b')).toBeUndefined();
  });

  it('answers about a path however it arrives', () => {
    expect(currentHref('')).toBe('/');
    expect(currentHref('chi-siamo')).toBe('/chi-siamo');
    expect(currentHref('/chi-siamo?da=nav')).toBe('/chi-siamo');
  });
});
