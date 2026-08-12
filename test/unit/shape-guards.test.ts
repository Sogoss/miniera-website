/* Negative tests for the guards over the clip shapes.
 *
 * Both defects they watch are silent by nature: a reference that resolves to
 * nothing publishes an unclipped photo, and a duplicated id publishes the wrong
 * shape. Neither fails a build, so the only way to know these guards work is to
 * have seen them fire.
 */
import { describe, expect, it } from 'vitest';
import {
  checkClipShapeReferences,
  checkDuplicateClipShapeIds,
  clipShapeIds,
} from '../guards/shapes.ts';

const SHAPES =
  '<svg width="0" height="0"><defs>' +
  '<clipPath id="clip-clover-8"><circle cx="0.5" cy="0.5" r="0.275"></circle></clipPath>' +
  '<clipPath id="clip-gem"><path d="M 0 0 Z"></path></clipPath>' +
  '</defs></svg>';

describe('checkClipShapeReferences', () => {
  it('accepts a page that carries the shape it asks for', () => {
    const page = `${SHAPES}<img style="clip-path: url(#clip-clover-8)" src="/foto.jpg">`;
    expect(checkClipShapeReferences(page, '', 'dist/index.html')).toEqual([]);
  });

  it('reports a page that asks for a shape it does not carry', () => {
    // What a page written without the layout looks like: it renders, the photo
    // is simply not cut, and nobody is told.
    const page = '<img style="clip-path: url(#clip-clover-8)" src="/foto.jpg">';
    const violations = checkClipShapeReferences(page, '', 'dist/81/index.html');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('clip-clover-8');
    expect(violations[0]!.detail).toContain('ClipShapes');
  });

  it('reads a reference written in a stylesheet, not only in an attribute', () => {
    const css = '.ritratto { clip-path: url(#clip-gem); }';
    expect(checkClipShapeReferences(SHAPES, css)).toEqual([]);
    expect(checkClipShapeReferences('<p>ciao</p>', css)).toHaveLength(1);
  });

  it('reads the attribute form as well', () => {
    const page = `${SHAPES}<image clip-path="url(#clip-gem)" href="/foto.jpg"/>`;
    expect(checkClipShapeReferences(page, '')).toEqual([]);
  });

  it('has nothing to say about a page that clips nothing', () => {
    // Which is every page of this PR: the shapes are defined here and used
    // from PR 6. The guard waits, it does not invent work.
    expect(checkClipShapeReferences(SHAPES, '')).toEqual([]);
  });

  it('ignores a reference and a definition left in a comment', () => {
    const commented = `${SHAPES}<!-- <img style="clip-path: url(#clip-cookie-6)"> -->`;
    expect(checkClipShapeReferences(commented, '')).toEqual([]);

    const onlyCommented = '<!-- <clipPath id="clip-gem"></clipPath> --><img style="clip-path: url(#clip-gem)">';
    expect(checkClipShapeReferences(onlyCommented, '')).toHaveLength(1);
  });

  it('ignores a reference left in a CSS comment', () => {
    // A `<style is:inline>` reaches dist/ verbatim — CycleAccents emits one —
    // so a rule left commented out in it would have failed every page over
    // markup that renders perfectly.
    expect(checkClipShapeReferences(SHAPES, '/* .vecchio { clip-path: url(#clip-quadri); } */')).toEqual([]);
  });

  it('sees a reference held in a custom property', () => {
    // Rule 2 says style is written with the tokens, so this is the natural
    // shape for PR 6 to give the portraits — and reading only `clip-path:
    // url(…)` made the guard pass over it without looking at anything.
    const tokenised = ':root { --clip-portrait: url(#clip-clover-8); } .p { clip-path: var(--clip-portrait); }';
    expect(checkClipShapeReferences(SHAPES, tokenised)).toEqual([]);

    const missing = ':root { --clip-portrait: url(#clip-arch); } .p { clip-path: var(--clip-portrait); }';
    const violations = checkClipShapeReferences(SHAPES, missing);
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('clip-arch');
  });

  it('says one thing about a shape asked for twenty times', () => {
    const many = Array.from({ length: 20 }, () => '<img style="clip-path: url(#clip-gem)">').join('');
    expect(checkClipShapeReferences(many, '')).toHaveLength(1);
  });
});

describe('checkDuplicateClipShapeIds', () => {
  it('accepts shapes that are all named differently', () => {
    expect(checkDuplicateClipShapeIds(SHAPES, 'dist/index.html')).toEqual([]);
  });

  it('reports two shapes with one name', () => {
    // The second is ignored rather than refused: everything asking for that
    // name quietly gets the first shape.
    const twice =
      '<clipPath id="clip-gem"><path d="M 0 0 Z"></path></clipPath>' +
      '<clipPath id="clip-gem"><polygon points="0,0 1,1"></polygon></clipPath>';
    const violations = checkDuplicateClipShapeIds(twice, 'dist/index.html');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('clip-gem');
    expect(violations[0]!.detail).toContain('dist/index.html');
  });

  it('reports every repetition of a name used three times', () => {
    const thrice = Array.from(
      { length: 3 },
      () => '<clipPath id="clip-gem"><path d="M 0 0 Z"></path></clipPath>',
    ).join('');
    expect(checkDuplicateClipShapeIds(thrice)).toHaveLength(2);
  });

  it('does not count a definition left in a comment', () => {
    const commented =
      '<clipPath id="clip-gem"><path d="M 0 0 Z"></path></clipPath>' +
      '<!-- <clipPath id="clip-gem"></clipPath> -->';
    expect(checkDuplicateClipShapeIds(commented)).toEqual([]);
  });

  it('reads the id whatever order the attributes are in', () => {
    // `<clipPath clipPathUnits="objectBoundingBox" id="…">` is the same
    // definition. Seeing only one of the two orders would have let a shape drop
    // out of every check the day somebody reformatted the file.
    const reordered =
      '<clipPath clipPathUnits="objectBoundingBox" id="clip-gem"></clipPath>' +
      '<clipPath id="clip-gem" clipPathUnits="objectBoundingBox"></clipPath>';
    expect(checkDuplicateClipShapeIds(reordered)).toHaveLength(1);
    expect(clipShapeIds(reordered)).toEqual(['clip-gem', 'clip-gem']);
  });
});

describe('clipShapeIds', () => {
  it('lists what a component defines, in order', () => {
    expect(clipShapeIds(SHAPES)).toEqual(['clip-clover-8', 'clip-gem']);
  });

  it('leaves out what is only in a comment', () => {
    expect(clipShapeIds('<!-- <clipPath id="clip-gem"></clipPath> -->')).toEqual([]);
  });
});
