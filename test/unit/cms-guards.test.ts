/* The negative half of rule 21: the CMS guards, shown failing.
 *
 * Every fixture here is a config.yml that has drifted from the schema in one
 * of the ways that drift is silent — a field only one side has, a `required`
 * the other way round, a date field that writes no zone, an image field with
 * no ceiling. The positive half runs against the real pair, in sources.test.ts.
 */
import { describe, expect, it } from 'vitest';
import {
  checkCmsConfigAgainstSchema,
  checkCmsDateTimezone,
  checkCmsFieldCoverage,
  checkCmsFieldKinds,
  checkCmsImageLimits,
  checkCmsRequiredParity,
  checkEntryFileNames,
  checkNoEntryBody,
} from '../guards/cms.ts';
import { cmsSchema } from '../support/cms.ts';
import type { SchemaField } from '../support/schema.ts';

/* A small stand-in for the schema of `eventi`: a required string, an optional
   one, a reference, an enum, an image and a list with two subfields. */
const SCHEMA: SchemaField[] = [
  { name: 'title', optional: false, kind: 'string' },
  { name: 'date', optional: false, kind: 'date' },
  { name: 'cycle', optional: false, kind: 'reference', reference: 'cicli' },
  {
    name: 'format',
    optional: false,
    kind: 'enum',
    options: ['incontro', 'proiezione'],
  },
  { name: 'photo', optional: true, kind: 'image' },
  {
    name: 'speakers',
    optional: true,
    kind: 'list',
    fields: [
      { name: 'person', optional: false, kind: 'reference', reference: 'relatori' },
      { name: 'role', optional: true, kind: 'string' },
    ],
  },
];

const FIELDS = [
  { name: 'title', widget: 'string' },
  {
    name: 'date',
    widget: 'datetime',
    input_timezone: 'Europe/Rome',
    output_utc: false,
    format: 'YYYY-MM-DDTHH:mm:ssZ',
  },
  { name: 'cycle', widget: 'relation', collection: 'cicli' },
  { name: 'format', widget: 'select', options: ['incontro', 'proiezione'] },
  { name: 'photo', widget: 'image', required: false },
  {
    name: 'speakers',
    widget: 'list',
    required: false,
    fields: [
      { name: 'person', widget: 'relation', collection: 'relatori' },
      { name: 'role', widget: 'string', required: false },
    ],
  },
];

/** The fields above, with one of them altered — or dropped, given `null`. */
function withField(name: string, changes: Record<string, unknown> | null) {
  return FIELDS.flatMap((field) =>
    field.name === name ? (changes === null ? [] : [{ ...field, ...changes }]) : [field],
  );
}

/* And with one of them written out in full, which is not the same thing: what
   a fixture about a *missing* option needs is a field that does not have it,
   and merging would keep the option from the field it is replacing. */
function replacingField(name: string, field: Record<string, unknown>) {
  return FIELDS.map((existing) => (existing.name === name ? field : existing));
}

function config(fields: unknown, extra: Record<string, unknown> = {}) {
  return {
    media_libraries: {
      default: {
        config: { transformations: { raster_image: { width: 1600, height: 1600 } } },
      },
    },
    collections: [{ name: 'eventi', fields }],
    ...extra,
  };
}

describe('checkCmsFieldCoverage', () => {
  it('says nothing when the two lists agree', () => {
    expect(checkCmsFieldCoverage(SCHEMA, FIELDS, 'eventi')).toEqual([]);
  });

  it('catches a schema field the form does not offer', () => {
    const violations = checkCmsFieldCoverage(SCHEMA, withField('photo', null), 'eventi');
    expect(violations).toHaveLength(1);
    expect(violations[0]?.detail).toContain('`photo`');
    expect(violations[0]?.detail).toContain('no field in public/admin/config.yml');
  });

  it('catches a form field the schema does not have', () => {
    const violations = checkCmsFieldCoverage(
      SCHEMA,
      [...FIELDS, { name: 'sottotitolo', widget: 'string' }],
      'eventi',
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]?.detail).toContain('`sottotitolo`');
    expect(violations[0]?.detail).toContain('thrown away at build time');
  });

  it('goes down into a list, where a missing subfield is just as invisible', () => {
    const speakers = {
      name: 'speakers',
      widget: 'list',
      required: false,
      fields: [{ name: 'person', widget: 'relation', collection: 'relatori' }],
    };
    const violations = checkCmsFieldCoverage(SCHEMA, replacingField('speakers', speakers), 'eventi');
    expect(violations).toHaveLength(1);
    expect(violations[0]?.detail).toContain('`role`');
    expect(violations[0]?.detail).toContain('eventi › speakers');
  });

  it('reports a field with no name rather than matching it against nothing', () => {
    const violations = checkCmsFieldCoverage(SCHEMA, [...FIELDS, { widget: 'string' }], 'eventi');
    expect(violations).toHaveLength(1);
    expect(violations[0]?.detail).toContain('(unnamed)');
  });
});

describe('checkCmsRequiredParity', () => {
  it('says nothing when required and optional line up', () => {
    expect(checkCmsRequiredParity(SCHEMA, FIELDS, 'eventi')).toEqual([]);
  });

  it('catches an optional field the form insists on', () => {
    const violations = checkCmsRequiredParity(SCHEMA, withField('photo', { required: true }), 'eventi');
    expect(violations).toHaveLength(1);
    expect(violations[0]?.detail).toContain('refuses an entry the site would publish');
  });

  it('catches a required field the form lets through empty', () => {
    const violations = checkCmsRequiredParity(SCHEMA, withField('title', { required: false }), 'eventi');
    expect(violations).toHaveLength(1);
    expect(violations[0]?.detail).toContain('after it has been committed');
  });

  it('reads the default too: no `required` at all means required', () => {
    // Sveltia's default, and the reason this can only go wrong one way round.
    const photo = { name: 'photo', widget: 'image' };
    expect(checkCmsRequiredParity(SCHEMA, replacingField('photo', photo), 'eventi')).toHaveLength(1);
  });

  it('goes down into a list', () => {
    const speakers = {
      name: 'speakers',
      widget: 'list',
      required: false,
      fields: [
        { name: 'person', widget: 'relation', collection: 'relatori' },
        { name: 'role', widget: 'string' },
      ],
    };
    const violations = checkCmsRequiredParity(SCHEMA, replacingField('speakers', speakers), 'eventi');
    expect(violations).toHaveLength(1);
    expect(violations[0]?.detail).toContain('eventi › speakers');
    expect(violations[0]?.detail).toContain('`role`');
  });
});

describe('checkCmsFieldKinds', () => {
  it('says nothing when every widget matches its type', () => {
    expect(checkCmsFieldKinds(SCHEMA, FIELDS, 'eventi')).toEqual([]);
  });

  it('catches a date written as a string, which is rule 11 lost', () => {
    const violations = checkCmsFieldKinds(SCHEMA, withField('date', { widget: 'string' }), 'eventi');
    expect(violations).toHaveLength(1);
    expect(violations[0]?.detail).toContain('`date`');
    expect(violations[0]?.detail).toContain('`datetime`');
  });

  it('catches an image written as a string, which is a photo with no ceiling', () => {
    expect(
      checkCmsFieldKinds(SCHEMA, withField('photo', { widget: 'string' }), 'eventi'),
    ).toHaveLength(1);
  });

  it('catches a relation pointed at the wrong collection', () => {
    const violations = checkCmsFieldKinds(
      SCHEMA,
      withField('cycle', { collection: 'sedi' }),
      'eventi',
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]?.detail).toContain('`sedi`');
  });

  it('catches an enum whose options have drifted', () => {
    const violations = checkCmsFieldKinds(
      SCHEMA,
      withField('format', { options: ['incontro', 'proiezione', 'concerto'] }),
      'eventi',
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]?.detail).toContain('`concerto`');
  });

  it('accepts the widgets a string can legitimately be', () => {
    // A colour is a string with a regular expression on it, and the widget
    // that writes one is `color`. A guard that fired here is one somebody
    // switches off.
    const schema: SchemaField[] = [{ name: 'color', optional: false, kind: 'string' }];
    expect(checkCmsFieldKinds(schema, [{ name: 'color', widget: 'color' }], 'cicli')).toEqual([]);
    expect(checkCmsFieldKinds(schema, [{ name: 'color', widget: 'text' }], 'cicli')).toEqual([]);
  });

  it('goes down into a list', () => {
    const speakers = {
      name: 'speakers',
      widget: 'list',
      required: false,
      fields: [
        { name: 'person', widget: 'relation', collection: 'sedi' },
        { name: 'role', widget: 'string', required: false },
      ],
    };
    const violations = checkCmsFieldKinds(SCHEMA, replacingField('speakers', speakers), 'eventi');
    expect(violations).toHaveLength(1);
    expect(violations[0]?.detail).toContain('eventi › speakers');
  });
});

describe('checkCmsDateTimezone', () => {
  it('says nothing when the field declares the zone and writes the offset', () => {
    expect(checkCmsDateTimezone(config(FIELDS))).toEqual([]);
  });

  it('catches a datetime field with no zone at all', () => {
    const violations = checkCmsDateTimezone(
      config(replacingField('date', { name: 'date', widget: 'datetime', output_utc: false, format: 'YYYY-MM-DDTHH:mm:ssZ' })),
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]?.rule).toBe('rule 11');
    expect(violations[0]?.detail).toContain("editor's browser");
  });

  it('catches the browser zone asked for by name', () => {
    // `local` is the default, and it is also what somebody writes on purpose
    // while testing on their own machine, where it looks right.
    expect(checkCmsDateTimezone(config(withField('date', { input_timezone: 'local' })))).toHaveLength(1);
  });

  it('catches a field that converts to UTC before writing', () => {
    expect(checkCmsDateTimezone(config(withField('date', { output_utc: true })))).toHaveLength(1);
    expect(checkCmsDateTimezone(config(withField('date', { picker_utc: true })))).toHaveLength(1);
  });

  it('catches a format that carries no offset', () => {
    const violations = checkCmsDateTimezone(
      config(withField('date', { format: 'YYYY-MM-DDTHH:mm:ss' })),
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]?.detail).toContain('no offset');
  });

  it('catches the letter Z passed off as an offset', () => {
    // `[Z]` in Day.js is the character, not the zone: every date would end in a
    // Z it does not mean, so the file states UTC while the time in it is Roman
    // — and checkDateHasOffset waves it through, because `Z` is a valid offset.
    // Two hours of error, in writing, with the whole suite green.
    const violations = checkCmsDateTimezone(
      config(withField('date', { format: 'YYYY-MM-DDTHH:mm:ss[Z]' })),
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]?.detail).toContain('no offset');
  });

  it('finds a datetime nested inside a list', () => {
    const nested = {
      name: 'speakers',
      widget: 'list',
      required: false,
      fields: [{ name: 'when', widget: 'datetime' }],
    };
    expect(checkCmsDateTimezone(config(replacingField('speakers', nested)))).not.toEqual([]);
  });
});

describe('checkCmsImageLimits', () => {
  it('says nothing when the global transformation caps both sides', () => {
    expect(checkCmsImageLimits(config(FIELDS))).toEqual([]);
  });

  it('catches an image field with no transformation anywhere', () => {
    const violations = checkCmsImageLimits({ collections: [{ name: 'eventi', fields: FIELDS }] });
    expect(violations).toHaveLength(1);
    expect(violations[0]?.detail).toContain('git keeps it for ever');
  });

  it('catches a field whose own library replaces the global one and loses the ceiling', () => {
    // This is what a field-level media library does: it replaces, it does not
    // add to. A portrait field written with its own `transformations` and no
    // sizes is an upload with no limit at all, under a global one that says
    // there is.
    const photo = {
      name: 'photo',
      widget: 'image',
      required: false,
      media_libraries: { default: { config: { transformations: { raster_image: { format: 'webp' } } } } },
    };
    const violations = checkCmsImageLimits(config(replacingField('photo', photo)));
    expect(violations).toHaveLength(1);
    expect(violations[0]?.detail).toContain('`width` and `height`');
  });

  it('catches a ceiling on one side only', () => {
    expect(
      checkCmsImageLimits(
        config(FIELDS, {
          media_libraries: {
            default: { config: { transformations: { raster_image: { width: 1600 } } } },
          },
        }),
      ),
    ).toHaveLength(1);
  });

  it('finds an image nested inside a list', () => {
    const nested = {
      name: 'speakers',
      widget: 'list',
      required: false,
      fields: [{ name: 'portrait', widget: 'image' }],
    };
    expect(
      checkCmsImageLimits({ collections: [{ name: 'eventi', fields: replacingField('speakers', nested) }] }),
    ).toHaveLength(2);
  });
});

describe('checkCmsConfigAgainstSchema', () => {
  /* Sveltia's own schema, out of the installed package. Everything else in this
     file compares our two files with each other; this is the third party to the
     agreement — the CMS, which reads neither of them and only reads the keys it
     knows. */
  const schema = cmsSchema();

  const valid = {
    backend: { name: 'github', repo: 'Sogoss/miniera-website', branch: 'main' },
    media_folder: 'src/assets/photos',
    collections: [
      {
        name: 'eventi',
        folder: 'src/content/eventi',
        fields: [
          {
            name: 'date',
            widget: 'datetime',
            input_timezone: 'Europe/Rome',
            format: 'YYYY-MM-DDTHH:mm:ssZ',
          },
        ],
      },
    ],
  };

  it('says nothing about a configuration Sveltia would understand', () => {
    expect(checkCmsConfigAgainstSchema(valid, schema)).toEqual([]);
  });

  it('catches the misspelt option every other check here would approve', () => {
    // `input_timzone` passes checkCmsDateTimezone under its own misspelling if
    // one reads it that way, and Sveltia falls back to the browser's zone
    // without a word. This is the only check that can see it.
    const typo = structuredClone(valid);
    const date = typo.collections[0]!.fields[0]! as Record<string, unknown>;
    delete date.input_timezone;
    date.input_timzone = 'Europe/Rome';

    const violations = checkCmsConfigAgainstSchema(typo, schema);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0]?.detail).toContain('/collections/0/fields/0');
  });

  it('reports one violation for one mistake, not one per branch of the schema', () => {
    // Every field type is an `anyOf`, so ajv reports the same wrong key once
    // per branch: undeduplicated, a single typo reads as five different
    // problems and the message stops being worth reading.
    const typo = structuredClone(valid);
    (typo.collections[0]!.fields[0]! as Record<string, unknown>).nonsense = true;
    expect(checkCmsConfigAgainstSchema(typo, schema)).toHaveLength(1);
  });

  it('catches a configuration with no backend at all', () => {
    const { backend: _backend, ...rest } = valid;
    expect(checkCmsConfigAgainstSchema(rest, schema).length).toBeGreaterThan(0);
  });

  it('catches an option whose value is of the wrong kind', () => {
    const wrong = structuredClone(valid);
    (wrong.collections[0] as Record<string, unknown>).fields = 'tutti';
    expect(checkCmsConfigAgainstSchema(wrong, schema).length).toBeGreaterThan(0);
  });
});

describe('checkEntryFileNames', () => {
  /* The same slugifier the support layer hands the real check: lower case,
     spaces to dashes. */
  const slugify = (value: string) =>
    value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  it('says nothing when the file is named the way the CMS would name it', () => {
    const entries = [{ path: 'src/content/eventi/81.md', data: { number: 81 } }];
    expect(checkEntryFileNames(entries, '{{fields.number}}', slugify, 'eventi')).toEqual([]);
  });

  it('catches the padded name a hand would write', () => {
    // What the five sample evenings were called before this PR, and what a
    // sixth would be called by anybody copying them.
    const entries = [{ path: 'src/content/eventi/081.md', data: { number: 81 } }];
    const violations = checkEntryFileNames(entries, '{{fields.number}}', slugify, 'eventi');
    expect(violations).toHaveLength(1);
    expect(violations[0]?.detail).toContain('`081`');
    expect(violations[0]?.detail).toContain('`81`');
  });

  it('expands a template of more than one field', () => {
    const entries = [
      { path: 'src/content/cicli/3-terra-di-nessuno.md', data: { number: 3, name: 'Terra di nessuno' } },
    ];
    expect(
      checkEntryFileNames(entries, '{{fields.number}}-{{fields.name}}', slugify, 'cicli'),
    ).toEqual([]);
  });

  it('accepts the short form of a template tag', () => {
    const entries = [{ path: 'src/content/sedi/palazzo.md', data: { name: 'Palazzo' } }];
    expect(checkEntryFileNames(entries, '{{name}}', slugify, 'sedi')).toEqual([]);
  });

  it('says so when the template resolves to nothing at all', () => {
    const entries = [{ path: 'src/content/eventi/81.md', data: {} }];
    const violations = checkEntryFileNames(entries, '{{fields.number}}', slugify, 'eventi');
    expect(violations).toHaveLength(1);
    expect(violations[0]?.detail).toContain('nothing to build a name from');
  });
});

describe('checkNoEntryBody', () => {
  const frontmatter = '---\nnumber: 81\ntitle: Chi tiene aperto il quartiere\n---\n';

  it('says nothing about a file that is frontmatter and nothing else', () => {
    expect(checkNoEntryBody(frontmatter, 'src/content/eventi/81.md')).toEqual([]);
  });

  it('catches prose under the frontmatter', () => {
    const violations = checkNoEntryBody(
      `${frontmatter}\nContenuto lungo facoltativo della serata, se un giorno serve.\n`,
      'src/content/eventi/81.md',
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]?.detail).toContain('reaches nobody');
    expect(violations[0]?.detail).toContain('Contenuto lungo');
  });

  it('lets a trailing blank line alone', () => {
    expect(checkNoEntryBody(`${frontmatter}\n\n`, 'src/content/eventi/81.md')).toEqual([]);
  });

  it('treats a file with no frontmatter as body from end to end', () => {
    // Otherwise the one shape it has no reason to expect is the one it says
    // nothing about.
    expect(checkNoEntryBody('Solo prosa, nessun frontmatter.\n', 'src/content/eventi/84.md')).toHaveLength(1);
  });
});
