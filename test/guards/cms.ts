/* Guards over rule 21: the CMS and the schema are the same list seen twice.
 *
 * public/admin/config.yml and src/content.config.ts declare the same fields to
 * two different readers, and nothing about either file makes them agree. What
 * happens when they stop is quiet in all three directions:
 *
 * - a field the schema has and the form does not is a field nobody ever fills
 *   in, and the site publishes an evening without it;
 * - a field the form has and the schema does not is written into the markdown
 *   and dropped at build time without a word;
 * - a field required in Zod and optional in the form is a build that fails on
 *   an entry the editor already saved and cannot see why.
 *
 * None of the three fails while somebody is looking, and all three are found
 * by comparing two lists nobody would think to compare by hand every time.
 *
 * The guards take the parsed config and the described schema, never the files:
 * that is what lets a fixture hand them a config that has drifted, without a
 * drifted config having to exist in the repository.
 */
import Ajv from 'ajv';
import type { SchemaField } from '../support/schema.ts';
import type { Violation } from './types.ts';

/** A field as config.yml writes it. Everything is optional: that is the point. */
export type CmsField = {
  name?: unknown;
  widget?: unknown;
  required?: unknown;
  collection?: unknown;
  options?: unknown;
  fields?: unknown;
  media_libraries?: unknown;
  input_timezone?: unknown;
  output_utc?: unknown;
  picker_utc?: unknown;
  format?: unknown;
  [key: string]: unknown;
};

export type CmsCollection = {
  name?: unknown;
  fields?: unknown;
  slug?: unknown;
  identifier_field?: unknown;
  media_libraries?: unknown;
  [key: string]: unknown;
};

export type CmsConfig = {
  collections?: unknown;
  media_libraries?: unknown;
  [key: string]: unknown;
};

/** The widgets that may stand for each kind of schema field. */
const WIDGETS: Record<string, string[]> = {
  string: ['string', 'text', 'color'],
  number: ['number'],
  boolean: ['boolean'],
  date: ['datetime'],
  enum: ['select'],
  image: ['image'],
  reference: ['relation'],
  list: ['list'],
};

function fieldsOf(value: unknown): CmsField[] {
  return Array.isArray(value)
    ? value.filter((field): field is CmsField => typeof field === 'object' && field !== null)
    : [];
}

export function collectionsOf(config: unknown): CmsCollection[] {
  const collections = (config as CmsConfig | null)?.collections;
  return Array.isArray(collections)
    ? collections.filter(
        (collection): collection is CmsCollection =>
          typeof collection === 'object' && collection !== null,
      )
    : [];
}

/** The collection of that name, or undefined — which is itself a violation. */
export function cmsCollection(config: unknown, name: string): CmsCollection | undefined {
  return collectionsOf(config).find((collection) => collection.name === name);
}

/**
 * The template Sveltia names a new entry with, resolved the way it resolves it.
 *
 * `slug` if it is written, otherwise the `identifier_field`, otherwise `title`.
 * Worked out here rather than in the test so that the naming rule has one home:
 * this file is where the CMS's own defaults are read, and a check that assumed
 * `{{fields.title}}` without saying so would be right about three collections
 * and quietly wrong about the fourth.
 */
export function slugTemplate(collection: CmsCollection | undefined): string {
  if (!collection) return '';
  if (typeof collection.slug === 'string' && collection.slug) return collection.slug;

  const identifier =
    typeof collection.identifier_field === 'string' && collection.identifier_field
      ? collection.identifier_field
      : 'title';
  return `{{fields.${identifier}}}`;
}

function nameOf(field: CmsField): string {
  return typeof field.name === 'string' ? field.name : '';
}

/**
 * Every schema field has a field in the CMS, and the CMS has nothing else.
 *
 * Both directions, because they fail differently and a check on one of them
 * reads as if it covered both. Nested lists are walked too: `speakers` and
 * `materials` are objects with their own fields, and a `role` missing from the
 * form is exactly as invisible as a `title` missing from it.
 */
export function checkCmsFieldCoverage(
  schema: SchemaField[],
  fields: unknown,
  where: string,
): Violation[] {
  const violations: Violation[] = [];
  const cmsFields = fieldsOf(fields);
  const cmsNames = new Set(cmsFields.map(nameOf));

  for (const field of schema) {
    if (!cmsNames.has(field.name)) {
      violations.push({
        rule: 'rule 21',
        detail: `\`${field.name}\` is declared in the schema of ${where} and has no field in public/admin/config.yml: nobody can fill it in, and the site publishes without it`,
      });
    }
  }

  const schemaNames = new Set(schema.map((field) => field.name));
  for (const field of cmsFields) {
    const name = nameOf(field);
    if (schemaNames.has(name)) continue;
    violations.push({
      rule: 'rule 21',
      detail: `\`${name || '(unnamed)'}\` is a field of ${where} in public/admin/config.yml and not in the schema: what an editor writes there is committed to the file and thrown away at build time, without a word anywhere`,
    });
  }

  /* Down into the lists, once both sides agree a list is there. */
  for (const field of schema) {
    if (field.kind !== 'list' || !field.fields) continue;
    const counterpart = cmsFields.find((candidate) => nameOf(candidate) === field.name);
    if (!counterpart) continue;
    violations.push(
      ...checkCmsFieldCoverage(field.fields, counterpart.fields, `${where} › ${field.name}`),
    );
  }

  return violations;
}

/**
 * Required in the schema, required in the form — and optional in both.
 *
 * Sveltia makes a field required unless it says otherwise, which is the right
 * default and the reason this can go wrong silently in one direction only: a
 * `.optional()` field left without `required: false` stops the editor from
 * saving an evening that is perfectly valid, and the message they get is about
 * a form, not about the site.
 *
 * A field with a `.default()` counts as optional: the file may leave it out,
 * and Zod fills it in.
 */
export function checkCmsRequiredParity(
  schema: SchemaField[],
  fields: unknown,
  where: string,
): Violation[] {
  const violations: Violation[] = [];
  const cmsFields = fieldsOf(fields);

  for (const field of schema) {
    const counterpart = cmsFields.find((candidate) => nameOf(candidate) === field.name);
    if (!counterpart) continue;

    const optionalInCms = counterpart.required === false;
    if (optionalInCms !== field.optional) {
      violations.push({
        rule: 'rule 21',
        detail: field.optional
          ? `\`${field.name}\` of ${where} is optional in the schema and required in public/admin/config.yml: the form refuses an entry the site would publish, and says so about itself`
          : `\`${field.name}\` of ${where} is required in the schema and optional in public/admin/config.yml (\`required: false\`): the form accepts an entry the build then refuses, after it has been committed`,
      });
    }

    /* Down into the list either way: a wrong `required` on the list itself says
       nothing about its subfields, and stopping here would report one of the
       two and leave the other for the next time somebody looks. */
    if (field.kind === 'list' && field.fields) {
      violations.push(
        ...checkCmsRequiredParity(field.fields, counterpart.fields, `${where} › ${field.name}`),
      );
    }
  }

  return violations;
}

/**
 * The widget matches what the field actually is.
 *
 * The names can agree while the fields do not, and that is where the expensive
 * ones hide: a `date` written as a string widget is rule 11 lost — no time
 * zone, no offset, an evening published an hour off — an `image()` written as a
 * string is a photograph that never passes through a size limit, and a
 * reference pointed at the wrong collection is a slug that resolves to nothing
 * and stops the build.
 *
 * The enum is compared value by value, in order: an option added to the schema
 * and not to the form cannot be chosen, and one added to the form and not to
 * the schema is chosen once and then fails the build.
 */
export function checkCmsFieldKinds(
  schema: SchemaField[],
  fields: unknown,
  where: string,
): Violation[] {
  const violations: Violation[] = [];
  const cmsFields = fieldsOf(fields);

  for (const field of schema) {
    const counterpart = cmsFields.find((candidate) => nameOf(candidate) === field.name);
    if (!counterpart) continue;

    const widget = typeof counterpart.widget === 'string' ? counterpart.widget : 'string';
    const allowed = WIDGETS[field.kind];

    if (allowed && !allowed.includes(widget)) {
      violations.push({
        rule: 'rule 21',
        detail: `\`${field.name}\` of ${where} is \`${field.kind}\` in the schema and \`widget: ${widget}\` in public/admin/config.yml: ${allowed.map((name) => `\`${name}\``).join(' or ')} is what writes a value that schema accepts`,
      });
      continue;
    }

    if (field.kind === 'reference' && counterpart.collection !== field.reference) {
      violations.push({
        rule: 'rule 21',
        detail: `\`${field.name}\` of ${where} refers to \`${field.reference}\` in the schema and to \`${String(counterpart.collection)}\` in public/admin/config.yml: what the form writes is a slug of the wrong collection, and it stops the build`,
      });
    }

    if (field.kind === 'enum') {
      const options = Array.isArray(counterpart.options) ? counterpart.options.map(String) : [];
      const expected = field.options ?? [];
      if (options.join('|') !== expected.join('|')) {
        violations.push({
          rule: 'rule 21',
          detail: `\`${field.name}\` of ${where} accepts ${expected.map((value) => `\`${value}\``).join(', ')} in the schema and ${options.length ? options.map((value) => `\`${value}\``).join(', ') : 'nothing'} in public/admin/config.yml`,
        });
      }
    }

    if (field.kind === 'list' && field.fields) {
      violations.push(
        ...checkCmsFieldKinds(field.fields, counterpart.fields, `${where} › ${field.name}`),
      );
    }
  }

  return violations;
}

/* Day.js writes the offset as `Z` or `ZZ`; anything else — or nothing —
   publishes a naked local time.

   And what square brackets hold is a literal, which is the trap: a format
   ending `[Z]` puts the *letter* Z at the end of every date, so the file says
   UTC while the time in it is Roman — two hours of error, stated in writing,
   and `checkDateHasOffset` accepts it because `Z` is a valid offset. The
   escapes come out before the token is looked for. */
const OFFSET_TOKEN = /Z/;
const ESCAPED = /\[[^\]]*\]/g;

/**
 * Rule 11, in the fourth place it can be lost.
 *
 * The other three are code and have their guards; this one is a form. Without
 * `input_timezone` the datetime field writes whatever zone the browser happens
 * to be in, so the evening entered from a laptop still set to London — or in a
 * summer month by somebody abroad — is published an hour out, on a site whose
 * every line of code is careful about exactly this. Nothing fails: the file is
 * valid, the build is green, and the poster on the door says nine.
 *
 * docs/contenuti.md has been promising «Il CMS scrive lo scostamento da sé»
 * since PR 3. This is what makes that sentence true.
 */
export function checkCmsDateTimezone(config: unknown, path = 'public/admin/config.yml'): Violation[] {
  const violations: Violation[] = [];

  for (const collection of collectionsOf(config)) {
    for (const field of datetimeFields(collection.fields)) {
      const where = `\`${nameOf(field)}\` of ${String(collection.name)}`;

      if (field.input_timezone !== 'Europe/Rome') {
        violations.push({
          rule: 'rule 11',
          detail: `${where} in ${path} does not declare \`input_timezone: Europe/Rome\`: the zone is then the one the editor's browser is in, and an evening at nine in Turin is published at another hour with nothing failing`,
        });
      }

      if (field.output_utc === true || field.picker_utc === true) {
        violations.push({
          rule: 'rule 11',
          detail: `${where} in ${path} converts to UTC before writing: the file then says \`Z\` and the evening reads two hours earlier in summer`,
        });
      }

      const format = typeof field.format === 'string' ? field.format : '';
      if (!OFFSET_TOKEN.test(format.replace(ESCAPED, ''))) {
        violations.push({
          rule: 'rule 11',
          detail: `${where} in ${path} writes the date as \`${format || '(default)'}\`, which carries no offset: \`checkDateHasOffset\` refuses a date without one, and the build machine — Cloudflare, in UTC — would decide it`,
        });
      }
    }
  }

  return violations;
}

function datetimeFields(fields: unknown): CmsField[] {
  return fieldsOf(fields).flatMap((field) => [
    ...(field.widget === 'datetime' ? [field] : []),
    ...datetimeFields(field.fields),
  ]);
}

type Transformation = { width?: unknown; height?: unknown };

/** The raster transformation a field ends up under, global or its own. */
function transformationFor(config: unknown, field: CmsField): Transformation | undefined {
  const source = (field.media_libraries ?? (config as CmsConfig | null)?.media_libraries) as
    | Record<string, any>
    | undefined;
  const raster = source?.default?.config?.transformations?.raster_image;
  return typeof raster === 'object' && raster !== null ? (raster as Transformation) : undefined;
}

/**
 * No image field without a ceiling on what it uploads.
 *
 * This is the barrier docs/contenuti.md asks for twice, and the only one that
 * keeps working once the migration is over: git does not forget, so a 4 MB
 * photograph committed on a Tuesday is in the history for good, and taking it
 * out means rewriting that history. The transformation runs in the browser
 * before the commit, which is the one moment at which the file can still be
 * made smaller.
 *
 * A field-level media library **replaces** the global one rather than adding to
 * it, so this resolves the same way Sveltia does: the field's own if it has
 * one, the global otherwise. That is also the trap it exists for — a portrait
 * field that declares its 800×800 and forgets `format` is not what this
 * catches, but a field that declares an empty library and loses the ceiling
 * altogether is.
 */
export function checkCmsImageLimits(config: unknown, path = 'public/admin/config.yml'): Violation[] {
  const violations: Violation[] = [];

  for (const collection of collectionsOf(config)) {
    for (const field of imageFields(collection.fields)) {
      const where = `\`${nameOf(field)}\` of ${String(collection.name)}`;
      const transformation = transformationFor(config, field);

      if (!transformation) {
        violations.push({
          rule: 'rule 21',
          detail: `${where} in ${path} uploads without a transformation: the original goes into the repository at whatever size the camera wrote it, and git keeps it for ever`,
        });
        continue;
      }

      const width = Number(transformation.width);
      const height = Number(transformation.height);
      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        violations.push({
          rule: 'rule 21',
          detail: `${where} in ${path} is transformed without both \`width\` and \`height\`: the missing one defaults to the original, so one side of a photograph has no ceiling at all`,
        });
      }
    }
  }

  return violations;
}

function imageFields(fields: unknown): CmsField[] {
  return fieldsOf(fields).flatMap((field) => [
    ...(field.widget === 'image' || field.widget === 'file' ? [field] : []),
    ...imageFields(field.fields),
  ]);
}

/**
 * The configuration is valid Sveltia configuration.
 *
 * Everything above compares the config with the schema of this site, and all of
 * it reads the keys *this file* writes: a misspelt `input_timezone` would be
 * checked by `checkCmsDateTimezone` under the misspelt name, found, and
 * approved — while Sveltia, which never saw that key, quietly falls back to the
 * browser's zone. The same holds for every other option here. Nothing that
 * compares our two files can see it, because the third party to the agreement
 * is the CMS itself.
 *
 * What can see it is Sveltia's own JSON schema, which ships inside the
 * installed package — so it is the schema of the pinned version, not of
 * whatever is current — and which sets `additionalProperties: false` nearly
 * everywhere. An option it does not know is an option Sveltia ignores.
 */
export function checkCmsConfigAgainstSchema(
  config: unknown,
  schema: unknown,
  path = 'public/admin/config.yml',
): Violation[] {
  /* ajv 8 is CommonJS; under an ESM loader the callable lands on `default`
     often enough that reaching for it blindly is the way this breaks in CI and
     not here. */
  const Constructor = ((Ajv as unknown as { default?: unknown }).default ??
    Ajv) as typeof Ajv;

  /* `strict: false` and no format checking: the schema uses `format: regex`
     and `format: uri`, which ajv does not know unless ajv-formats is installed,
     and complaining about them would be this guard reporting on Sveltia's
     schema instead of on our config. */
  const validate = new Constructor({ strict: false, allErrors: true, validateFormats: false })
    .compile(schema as object);

  if (validate(config)) return [];

  const errors = validate.errors ?? [];

  /* One wrong key produces sixty errors, and most of them are false: every
     field type is a branch of an `anyOf`, so ajv reports what each branch
     wanted — «must have required property 'options'», «must be equal to
     constant» — and then says the *collection* is not a collection either,
     because the branch containing that field failed. Handed over as they come,
     the one true sentence is somewhere in the middle of them.

     What is read instead is the unknown keys, at the deepest place they are
     reported: that is the field itself rather than the collection around it.
     A second, shallower one turns up once this is fixed, which is the right
     order to meet them in. */
  const unknown = errors.filter((error) => error.keyword === 'additionalProperties');
  const deepest = Math.max(...unknown.map((error) => error.instancePath.split('/').length), 0);

  /* And of the keys reported there, the ones reported *most often*. A branch
     that expects a boolean field calls `input_timezone` an unknown key too, so
     the deepest path alone still names three keys for one typo. The real one is
     unknown to every branch and the others to all but their own, so it is the
     one with the highest count — by exactly one, which is enough. */
  const unknownKey = (error: { instancePath: string; params: unknown }): string =>
    `${error.instancePath} :: ${(error.params as { additionalProperty?: string }).additionalProperty}`;

  const timesUnknown = new Map<string, number>();
  for (const error of unknown) {
    const key = unknownKey(error);
    timesUnknown.set(key, (timesUnknown.get(key) ?? 0) + 1);
  }
  const mostOften = Math.max(...timesUnknown.values(), 0);

  const violations: Violation[] = [];
  const seen = new Set<string>();

  const add = (at: string, message: string) => {
    const detail = `${path} at ${at || '(the root of the file)'}: ${message}. Sveltia reads its own schema — an option it does not know is one it ignores, silently, and every check next door still passes because they read the keys this file writes`;
    if (seen.has(detail)) return;
    seen.add(detail);
    violations.push({ rule: 'rule 21', detail });
  };

  for (const error of unknown) {
    if (error.instancePath.split('/').length !== deepest) continue;
    const key = (error.params as { additionalProperty?: string }).additionalProperty;
    if (timesUnknown.get(unknownKey(error)) !== mostOften) continue;
    add(error.instancePath, `\`${key}\` is not an option Sveltia knows`);
  }

  /* Nothing was an unknown key: a value of the wrong shape, or something
     missing. Those are said plainly, and capped — the cascade is as long here
     as it is above. */
  if (violations.length === 0) {
    for (const error of errors.slice(0, 5)) add(error.instancePath, error.message ?? 'is not valid');
  }

  return violations;
}

/**
 * A content file is named the way the CMS would name it.
 *
 * From PR 14 there are two hands writing in src/content/, and only one of them
 * reads config.yml. The slug template is where the naming lives, so that is
 * what this expands: a file called anything else is one nobody decided — and
 * for cicli, sedi and relatori the file name is the string events refer to
 * them by, so a hand-made name that drifts from the convention is a reference
 * that resolves today and stops resolving the day the CMS rewrites the entry
 * under its own name.
 *
 * `slugify` is passed in rather than imported: it has to be the very function
 * Astro uses to turn a file name into an id, and that is the support layer's
 * business, not this one's.
 */
export function checkEntryFileNames(
  entries: { path: string; data: Record<string, unknown> }[],
  template: string,
  slugify: (value: string) => string,
  collection: string,
): Violation[] {
  const violations: Violation[] = [];

  for (const entry of entries) {
    const fileName = entry.path.split('/').pop()?.replace(/\.md$/, '') ?? '';
    const expected = slugify(expandTemplate(template, entry.data));

    if (!expected) {
      violations.push({
        rule: 'rule 21',
        detail: `${entry.path} has nothing to build a name from: the slug template of ${collection} is \`${template}\` and this entry leaves it empty`,
      });
      continue;
    }

    if (fileName === expected) continue;

    violations.push({
      rule: 'rule 21',
      detail: `${entry.path} is named \`${fileName}\` and the CMS would file it as \`${expected}\` (slug template \`${template}\` of ${collection}): two conventions in one folder, and the second one arrives the first time somebody edits this entry from /admin`,
    });
  }

  return violations;
}

/** `{{fields.number}}` and `{{number}}`, which is what Sveltia accepts. */
function expandTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{\s*(?:fields\.)?([\w.]+)\s*\}\}/g, (_, key: string) => {
    const value = data[key];
    return value === undefined || value === null ? '' : String(value);
  });
}

/* The body of a markdown file: what comes after the closing fence of the
   frontmatter. */
const AFTER_FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/;

/**
 * No content file carries a body.
 *
 * Nothing renders one. Astro hands the markdown body over separately from the
 * frontmatter and no page of this site asks for it, so prose written there is
 * prose that reaches nobody — and it is the most convincing kind of unpublished
 * text, because the file looks complete and the site looks fine.
 *
 * It is also what decided that the CMS has no body field: offering one would
 * invite exactly that, and leaving the bodies in place while not offering one
 * would have the CMS quietly delete them the first time an entry is saved. The
 * day a body has somewhere to go it becomes a field of the schema, with a field
 * in the form beside it — not prose that survived out of habit.
 */
export function checkNoEntryBody(markdown: string, path: string): Violation[] {
  /* A file with no frontmatter fence at all is body from end to end, and
     reporting nothing about it would be this guard falling open on the one
     shape it has no reason to expect. */
  const match = AFTER_FRONTMATTER.exec(markdown);
  const body = match ? (match[1] ?? '') : markdown;
  if (!body.trim()) return [];

  return [
    {
      rule: 'rule 21',
      detail: `${path} carries a body under its frontmatter («${body.trim().slice(0, 40)}…»), and no page renders it: it reaches nobody, and the CMS — which has no body field, for this reason — drops it the first time the entry is saved`,
    },
  ];
}
