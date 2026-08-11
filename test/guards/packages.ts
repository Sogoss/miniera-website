/* Guards over package.json and package-lock.json. */
import type { Violation } from './types.ts';

type Manifest = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

type LockEntry = {
  dev?: boolean;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

type Lockfile = {
  packages?: Record<string, LockEntry>;
};

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function names(section: Record<string, string> | undefined): string[] {
  return Object.keys(section ?? {});
}

/**
 * Names that some *other* production package asks for.
 *
 * A devDependency can legitimately also be pulled in by the runtime tree — as
 * `@types/node` is, being an optional peer of vite, which arrives under astro.
 * npm is right not to mark those `"dev": true`, so the flag check has to skip
 * them or it reports a defect that is not there.
 *
 * The root entry is deliberately excluded. Its dependency lists are the very
 * thing under examination: counting them would let a package that drifted into
 * the root's production list vouch for itself, and the guard would go quiet on
 * exactly the defect it exists to catch.
 */
function requiredByProduction(lock: Lockfile): Set<string> {
  const required = new Set<string>();
  for (const [path, entry] of Object.entries(lock.packages ?? {})) {
    if (path === '' || entry.dev === true) continue;
    for (const section of ['dependencies', 'optionalDependencies', 'peerDependencies'] as const) {
      for (const name of names(entry[section])) required.add(name);
    }
  }
  return required;
}

const SECTIONS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
] as const;

/* --- Rule 2: no Tailwind ------------------------------------------------ */

/**
 * Tailwind was removed on purpose. The design system is already a token
 * system in plain CSS, and keeping both would mean maintaining a translation
 * between two vocabularies that say the same thing, forever.
 */
export function checkNoTailwind(manifest: unknown): Violation[] {
  const violations: Violation[] = [];
  const pkg = asObject(manifest) as Manifest;

  for (const section of SECTIONS) {
    for (const name of names(pkg[section])) {
      if (/tailwind/i.test(name)) {
        violations.push({
          rule: 'rule 2',
          detail: `\`${name}\` under ${section}: styling is written with the tokens in src/styles/tokens/`,
        });
      }
    }
  }

  return violations;
}

/* --- Lockfile drift ----------------------------------------------------- */

/**
 * The offline half of the lockfile check, and the one that would have caught
 * today's defect: the three @fontsource packages sat under the lockfile's
 * root `dependencies` with no `"dev": true`, so `npm ci --omit=dev` installed
 * them as production dependencies. The woff2 files are committed under
 * src/assets/fonts/ — those packages are development-only for real.
 *
 * The CI job also diffs a regenerated lockfile, which catches every other kind
 * of drift; this guard needs neither the network nor git, so it runs in the
 * unit layer and fails in one second instead of one minute.
 */
export function checkDevDepsInLockfile(
  manifest: unknown,
  lockfile: unknown,
): Violation[] {
  const violations: Violation[] = [];
  const pkg = asObject(manifest) as Manifest;
  const lock = asObject(lockfile) as Lockfile;
  const root = lock.packages?.[''];
  const alsoProduction = requiredByProduction(lock);

  if (!root) {
    return [
      {
        rule: 'lockfile',
        detail: 'package-lock.json has no root entry under `packages[""]`',
      },
    ];
  }

  for (const name of names(pkg.devDependencies)) {
    if (!(name in (root.devDependencies ?? {}))) {
      violations.push({
        rule: 'lockfile',
        detail: `\`${name}\` is a devDependency in package.json but is missing from \`packages[""].devDependencies\` in the lockfile`,
      });
    }
    if (name in (root.dependencies ?? {})) {
      violations.push({
        rule: 'lockfile',
        detail: `\`${name}\` is a devDependency in package.json but the lockfile records it under \`packages[""].dependencies\``,
      });
    }
    const entry = lock.packages?.[`node_modules/${name}`];
    if (entry && entry.dev !== true && !alsoProduction.has(name)) {
      violations.push({
        rule: 'lockfile',
        detail: `\`node_modules/${name}\` is not marked \`"dev": true\`: \`npm ci --omit=dev\` would install it in production`,
      });
    }
  }

  for (const name of names(pkg.dependencies)) {
    if (!(name in (root.dependencies ?? {}))) {
      violations.push({
        rule: 'lockfile',
        detail: `\`${name}\` is a dependency in package.json but is missing from \`packages[""].dependencies\` in the lockfile`,
      });
    }
    const entry = lock.packages?.[`node_modules/${name}`];
    if (entry?.dev === true) {
      violations.push({
        rule: 'lockfile',
        detail: `\`node_modules/${name}\` is marked \`"dev": true\` but package.json lists it as a runtime dependency`,
      });
    }
  }

  return violations;
}
