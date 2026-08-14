/* Reading the CMS configuration.
 *
 * Parsed with `yaml`, like the frontmatter, and for the same reason: what the
 * guards work on is the object, so that a fixture can hand them a config that
 * has drifted without a drifted config having to exist in the repository.
 */
import { parse } from 'yaml';
import { read, readJson } from './paths.ts';

export const CMS_CONFIG_PATH = 'public/admin/config.yml';

/* Sveltia's own JSON schema for that file, out of the installed package: the
   schema of the version package-lock.json pins, and not of whatever is current
   — the two would part company on the day of an upgrade, which is the one day
   this has to be right. */
export const CMS_SCHEMA_PATH = 'node_modules/@sveltia/cms/schema/sveltia-cms.json';

/** The configuration Sveltia loads, as an object. */
export function cmsConfig(path = CMS_CONFIG_PATH): unknown {
  return parse(read(path));
}

export function cmsSchema(path = CMS_SCHEMA_PATH): unknown {
  return readJson(path);
}
