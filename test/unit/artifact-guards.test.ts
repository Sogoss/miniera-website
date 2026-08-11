import { describe, expect, it } from 'vitest';
import { checkDesignRuntimeArtifacts } from '../guards/artifacts.ts';

describe('checkDesignRuntimeArtifacts', () => {
  it('passes on ordinary markup', () => {
    const html = '<section data-cycle="3"><h2>Chi tiene aperto il quartiere</h2></section>';
    expect(checkDesignRuntimeArtifacts(html, 'dist/index.html')).toEqual([]);
  });

  it.each([
    ['<x-dc name="Bottone"></x-dc>', '<x-dc>'],
    ['<sc-for each="eventi"></sc-for>', '<sc-for>'],
    ['<sc-if cond="futuro"></sc-if>', '<sc-if>'],
    ['<x-import src="./_ds/index.html"></x-import>', '<x-import>'],
    ['<image-slot src="foto.jpg"></image-slot>', '<image-slot>'],
    ['window.DCLogic = {};', 'DCLogic'],
    ['<script src="/support.js"></script>', 'support.js'],
    ['<script src="/image-slot.js"></script>', 'image-slot.js'],
  ])('reports %s', (snippet, label) => {
    const violations = checkDesignRuntimeArtifacts(snippet, 'dist/index.html');
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0]!.rule).toBe('rule 8');
    expect(violations.some((v) => v.detail.includes(label))).toBe(true);
  });

  it('does not fire on a hashed filename that happens to contain a marker', () => {
    // dist/_astro filenames are random enough to produce "sc-if" by accident;
    // that is why the markers are matched as tags and not as bare substrings.
    const html = '<link rel="stylesheet" href="/_astro/index.Bsc-ifQ0.css">';
    expect(checkDesignRuntimeArtifacts(html, 'dist/index.html')).toEqual([]);
  });

  it('names the file it found the artifact in', () => {
    const violations = checkDesignRuntimeArtifacts('<x-dc></x-dc>', 'dist/81/index.html');
    expect(violations[0]!.detail).toContain('dist/81/index.html');
  });

  it('is reusable across calls', () => {
    // The patterns are module-level and carry the /g flag: without resetting
    // lastIndex the second call would silently find nothing.
    const snippet = '<x-dc></x-dc>';
    const first = checkDesignRuntimeArtifacts(snippet, 'a.html');
    const second = checkDesignRuntimeArtifacts(snippet, 'b.html');
    expect(second).toHaveLength(first.length);
  });
});
