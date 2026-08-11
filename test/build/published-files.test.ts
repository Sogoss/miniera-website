import { describe, expect, it } from 'vitest';
import { checkDesignRuntimeArtifacts } from '../guards/artifacts.ts';
import { listPublishedFiles, readPublishedFiles } from '../support/dist.ts';

describe('what the build publishes', () => {
  it('produced a home page', () => {
    expect(listPublishedFiles()).toContain('dist/index.html');
  });

  it('carries nothing from the Claude Design runtime', () => {
    const files = readPublishedFiles();
    expect(files.length).toBeGreaterThan(0);

    const violations = files.flatMap(({ path, text }) =>
      checkDesignRuntimeArtifacts(text, path),
    );
    expect(violations.map((v) => v.detail)).toEqual([]);
  });
});
