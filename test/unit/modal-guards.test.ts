/* Negative tests for the guards over the modal.
 *
 * All three defects render perfectly. A button whose target does not exist is a
 * tap that does nothing; a second dialog is markup nobody will ever see; and
 * content shut inside a template is content that exists for the script and for
 * nobody else.
 */
import { describe, expect, it } from 'vitest';
import {
  checkLinksOutsideTemplates,
  checkModalTargets,
  checkNoJsSwitch,
  checkSingleModal,
  modalOpeners,
} from '../guards/modal.ts';

const PAGE =
  '<button data-modal-from="materials-78" data-modal-title="Il cinema">Rivedi</button>' +
  '<ul id="materials-78"><li><a href="https://youtube.com/x">Rivedi Zatterin</a></li></ul>' +
  '<dialog data-modal><div data-modal-body></div></dialog>';

describe('checkModalTargets', () => {
  it('accepts a button that opens something', () => {
    expect(checkModalTargets(PAGE, 'dist/index.html')).toEqual([]);
  });

  it('reports a button that opens nothing', () => {
    const dead = '<button data-modal-from="materials-99">Rivedi</button>';
    const violations = checkModalTargets(dead, 'dist/index.html');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('materials-99');
    expect(violations[0]!.detail).toContain('dist/index.html');
  });

  it('says one thing about a target missing from twenty buttons', () => {
    const many = Array.from(
      { length: 20 },
      () => '<button data-modal-from="booking">Prenota</button>',
    ).join('');
    expect(checkModalTargets(many)).toHaveLength(1);
  });

  it('ignores a button left in a comment', () => {
    expect(checkModalTargets('<!-- <button data-modal-from="ghost"></button> -->')).toEqual([]);
  });

  it('accepts the id of a template, which is where the booking text lives', () => {
    const booking =
      '<button data-modal-from="booking">Prenota</button>' +
      '<template id="booking"><p>La sala ha sessanta posti.</p></template>';
    expect(checkModalTargets(booking)).toEqual([]);
  });

  it('does not accept an id shut inside a template', () => {
    // `document.getElementById` does not look in there: the contents of a
    // template are an inert document of their own. The attribute is in the
    // markup, the element is not in the page, and the button is dead — which
    // is the one failure this guard exists for.
    const unreachable =
      '<button data-modal-from="materials-78">Rivedi</button>' +
      '<template id="booking"><ul id="materials-78"></ul></template>';
    const violations = checkModalTargets(unreachable, 'dist/index.html');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('materials-78');
  });

  it('finds the openers whatever quotes they use', () => {
    expect(modalOpeners("<button data-modal-from='booking'>")).toHaveLength(1);
  });
});

describe('checkSingleModal', () => {
  it('accepts the one modal of the page', () => {
    expect(checkSingleModal(PAGE)).toEqual([]);
  });

  it('reports a second one', () => {
    // The script talks to the first dialog it finds: a second sits there
    // collecting nothing, and with 81 evenings a modal each would be 81 copies
    // of the same chrome in the DOM.
    const twice = `${PAGE}<dialog data-modal></dialog>`;
    const violations = checkSingleModal(twice, 'dist/index.html');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('second');
  });

  it('says nothing about a page with no modal at all', () => {
    expect(checkSingleModal('<p>ciao</p>')).toEqual([]);
  });
});

describe('checkLinksOutsideTemplates', () => {
  it('accepts links that are in the markup', () => {
    expect(checkLinksOutsideTemplates(PAGE, ['https://youtube.com/x'])).toEqual([]);
  });

  it('reports a link that only exists inside a template', () => {
    // The shape this guard exists for: moving the recordings into a template
    // «because the modal clones them anyway» takes them away from a reader with
    // no scripting, from a crawler and from Ctrl+F.
    const hidden =
      '<button data-modal-from="materials-78"></button>' +
      '<template id="materials-78"><a href="https://youtube.com/x">Rivedi</a></template>';
    const violations = checkLinksOutsideTemplates(hidden, ['https://youtube.com/x'], 'dist/index.html');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('youtube.com/x');
  });

  it('has nothing to say when nothing is expected', () => {
    expect(checkLinksOutsideTemplates(PAGE, [])).toEqual([]);
  });
});

/* The switch that decides which of the two forms a reader gets.
 *
 * The one guard here written after the defect rather than before it: this was
 * shipped at PR 7 and found at PR 12, by opening the built site and putting the
 * class back by hand. The source was right the whole time. */
describe('checkNoJsSwitch', () => {
  const SWITCH = '.no-js .only-js,html:not(.no-js) .no-js-only{display:none!important}';

  it('accepts the rule that wins', () => {
    expect(checkNoJsSwitch(SWITCH)).toEqual([]);
  });

  it('accepts the two halves written apart, and spaced as a person types them', () => {
    // The minifier merges them into one rule with a comma; global.css writes
    // them as a list across two lines. Both are the same stylesheet.
    const apart =
      '.no-js .only-js { display: none !important; }\n' +
      'html:not(.no-js) .no-js-only { display: none !important; }';
    expect(checkNoJsSwitch(apart)).toEqual([]);
  });

  it('reports the tie, which is what was actually published', () => {
    // Two classes on each side: `.no-js .only-js` against the
    // `.button[data-astro-cid-…]` a scoped style compiles to. The order of the
    // stylesheets decided, and it decided for the component.
    const tie = '.no-js .only-js,html:not(.no-js) .no-js-only{display:none}';
    const violations = checkNoJsSwitch(tie, 'dist/index.html');
    expect(violations).toHaveLength(2);
    expect(violations[0]!.rule).toBe('modal');
    expect(violations[0]!.detail).toContain('!important');
    expect(violations[0]!.detail).toContain('dist/index.html');
  });

  it('reports the half that is missing, which is worse than both missing', () => {
    // Half a switch publishes a dead button on top of the links it stands in
    // for — the page shows both forms of the same control, one of which does
    // nothing.
    const half = '.no-js .only-js{display:none!important}';
    const violations = checkNoJsSwitch(half);
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('no-js-only');
  });

  it('is not satisfied by a rule that names the selector without hiding it', () => {
    // A rule about the same elements — a margin, an outline — is legitimate
    // work, and it is not this. Counted as an answer it would let the switch
    // disappear entirely with the suite green.
    const other = '.no-js .only-js{margin:0}html:not(.no-js) .no-js-only{margin:0}';
    expect(checkNoJsSwitch(other)).toHaveLength(2);
    expect(checkNoJsSwitch(other)[0]!.detail).toContain('nothing hides');
  });

  it('says something about a stylesheet with no switch at all', () => {
    expect(checkNoJsSwitch('.button{display:inline-flex}')).toHaveLength(2);
  });
});
