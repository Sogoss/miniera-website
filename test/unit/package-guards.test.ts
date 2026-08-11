import { describe, expect, it } from 'vitest';
import { checkDevDepsInLockfile, checkNoTailwind } from '../guards/packages.ts';

describe('checkNoTailwind', () => {
  it('passes on a manifest without it', () => {
    expect(checkNoTailwind({ dependencies: { astro: '^7.2.0' } })).toEqual([]);
  });

  it.each([
    'dependencies',
    'devDependencies',
    'optionalDependencies',
    'peerDependencies',
  ])('reports it under %s', (section) => {
    const violations = checkNoTailwind({ [section]: { tailwindcss: '^4.0.0' } });
    expect(violations).toHaveLength(1);
    expect(violations[0]!.rule).toBe('rule 2');
  });

  it('catches the integration package too, not just tailwindcss itself', () => {
    expect(checkNoTailwind({ dependencies: { '@astrojs/tailwind': '^6.0.0' } })).toHaveLength(1);
  });

  it('tolerates a manifest that is not an object', () => {
    expect(checkNoTailwind(null)).toEqual([]);
    expect(checkNoTailwind('nonsense')).toEqual([]);
  });
});

describe('checkDevDepsInLockfile', () => {
  const manifest = {
    dependencies: { astro: '^7.2.0' },
    devDependencies: { '@fontsource/archivo-black': '^5.3.0' },
  };

  const goodLock = {
    packages: {
      '': {
        dependencies: { astro: '^7.2.0' },
        devDependencies: { '@fontsource/archivo-black': '^5.3.0' },
      },
      'node_modules/astro': { version: '7.2.0' },
      'node_modules/@fontsource/archivo-black': { version: '5.3.0', dev: true },
    },
  };

  it('passes when the lockfile agrees with the manifest', () => {
    expect(checkDevDepsInLockfile(manifest, goodLock)).toEqual([]);
  });

  it('reproduces the defect this guard was written for', () => {
    // The state the repository was actually in: the @fontsource packages sat
    // under the lockfile's root `dependencies` with no `"dev": true`, so
    // `npm ci --omit=dev` installed them in production.
    const drifted = {
      packages: {
        '': {
          dependencies: {
            astro: '^7.2.0',
            '@fontsource/archivo-black': '^5.3.0',
          },
        },
        'node_modules/astro': { version: '7.2.0' },
        'node_modules/@fontsource/archivo-black': { version: '5.3.0' },
      },
    };
    const violations = checkDevDepsInLockfile(manifest, drifted);
    expect(violations.length).toBeGreaterThanOrEqual(3);
    expect(violations.some((v) => v.detail.includes('--omit=dev'))).toBe(true);
    expect(
      violations.some((v) => v.detail.includes('packages[""].dependencies')),
    ).toBe(true);
  });

  it('accepts a devDependency that the runtime tree also pulls in', () => {
    // The case that caught this guard out when it was first written:
    // @types/node is declared as a devDependency here, but it is also an
    // optional peer of vite, which arrives under astro. npm is right not to
    // mark it `"dev": true`, and the guard must not call that a defect.
    const withTypes = {
      dependencies: { astro: '^7.2.0' },
      devDependencies: { '@types/node': '^24.13.3' },
    };
    const lock = {
      packages: {
        '': {
          dependencies: { astro: '^7.2.0' },
          devDependencies: { '@types/node': '^24.13.3' },
        },
        'node_modules/astro': { version: '7.2.0', dependencies: { vite: '^8.2.1' } },
        'node_modules/vite': { version: '8.2.1', peerDependencies: { '@types/node': '>=22' } },
        'node_modules/@types/node': { version: '24.13.3' },
      },
    };
    expect(checkDevDepsInLockfile(withTypes, lock)).toEqual([]);
  });

  it('still reports a devDependency that nothing in production needs', () => {
    // Same lockfile shape as above, but nobody asks for the package: this is
    // the @fontsource case and it has to keep failing.
    const lock = {
      packages: {
        '': {
          dependencies: { astro: '^7.2.0' },
          devDependencies: { '@fontsource/archivo-black': '^5.3.0' },
        },
        'node_modules/astro': { version: '7.2.0' },
        'node_modules/@fontsource/archivo-black': { version: '5.3.0' },
      },
    };
    const violations = checkDevDepsInLockfile(manifest, lock);
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('--omit=dev');
  });

  it('reports a runtime dependency wrongly marked as dev', () => {
    const wrong = {
      packages: {
        '': { dependencies: { astro: '^7.2.0' }, devDependencies: manifest.devDependencies },
        'node_modules/astro': { version: '7.2.0', dev: true },
        'node_modules/@fontsource/archivo-black': { version: '5.3.0', dev: true },
      },
    };
    const violations = checkDevDepsInLockfile(manifest, wrong);
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('runtime dependency');
  });

  it('reports a lockfile with no root entry', () => {
    const violations = checkDevDepsInLockfile(manifest, { packages: {} });
    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain('root entry');
  });
});
