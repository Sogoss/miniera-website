/* The four collections, described in the terms the CMS is written in.
 *
 * The guards in test/guards/cms.ts compare two lists of fields, and this is
 * where the first one comes from: src/content.config.ts itself, read through
 * the `astro:content` stub next door. Not a list written into a test — that
 * would be a third copy of the thing the guards exist to keep in step, and it
 * would drift the first time somebody adds a field and only remembers two of
 * the three places.
 *
 * Zod's internals are read here and nowhere else: `_def.type`, `_def.innerType`
 * and the rest are Zod's business and change with its major versions, so they
 * are kept behind this one function instead of spread through the guards.
 */
import { collections } from '../../src/content.config.ts';
import { IS_IMAGE, REFERENCED_COLLECTION, image } from './astro-content.ts';

export type FieldKind =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'enum'
  | 'image'
  | 'reference'
  | 'list'
  | 'unknown';

export type SchemaField = {
  name: string;
  /** May be absent from the file: `.optional()`, or `.default()`. */
  optional: boolean;
  kind: FieldKind;
  /** For `enum`, the accepted values in the order they are declared. */
  options?: string[];
  /** For `reference`, the collection it points at. */
  reference?: string;
  /** For `list`, the fields of a single item. */
  fields?: SchemaField[];
};

type ZodLike = {
  _def?: Record<string, any>;
  def?: Record<string, any>;
  isOptional?: () => boolean;
  shape?: Record<string, unknown>;
};

function definitionOf(schema: unknown): Record<string, any> {
  const zod = (schema ?? {}) as ZodLike;
  return zod._def ?? zod.def ?? {};
}

/**
 * The schema with `.optional()` and `.default()` peeled off.
 *
 * Both mean the same thing to a CMS field — the editor may leave it empty —
 * and both hide the type underneath, which is what everything else here needs
 * to see.
 */
function unwrap(schema: unknown): unknown {
  let current = schema;
  for (let depth = 0; depth < 8; depth++) {
    const definition = definitionOf(current);
    if (definition.type !== 'optional' && definition.type !== 'default' && definition.type !== 'nullable') {
      return current;
    }
    current = definition.innerType;
  }
  return current;
}

function shapeOf(schema: unknown): Record<string, unknown> {
  const zod = (schema ?? {}) as ZodLike;
  return (zod.shape ?? definitionOf(schema).shape ?? {}) as Record<string, unknown>;
}

function describe(name: string, schema: unknown): SchemaField {
  const optional = typeof (schema as ZodLike).isOptional === 'function'
    ? Boolean((schema as ZodLike).isOptional?.())
    : false;
  const inner = unwrap(schema);
  const definition = definitionOf(inner);

  /* The two markers first: a reference and an image are both strings by the
     time Zod has them, and telling them apart is the whole reason the stub
     marks them. */
  if ((inner as Record<symbol, unknown>)[REFERENCED_COLLECTION]) {
    return {
      name,
      optional,
      kind: 'reference',
      reference: String((inner as Record<symbol, unknown>)[REFERENCED_COLLECTION]),
    };
  }
  if ((inner as Record<symbol, unknown>)[IS_IMAGE]) {
    return { name, optional, kind: 'image' };
  }

  switch (definition.type) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'date':
      return { name, optional, kind: definition.type as FieldKind };
    case 'enum':
      return {
        name,
        optional,
        kind: 'enum',
        options: Object.values(definition.entries ?? {}).map(String),
      };
    case 'array': {
      const element = unwrap(definition.element);
      return {
        name,
        optional,
        kind: 'list',
        fields: Object.entries(shapeOf(element)).map(([key, value]) => describe(key, value)),
      };
    }
    default:
      return { name, optional, kind: 'unknown' };
  }
}

/**
 * The fields of one collection, in the order the schema declares them.
 *
 * Throws on a name that is not a collection rather than returning nothing: an
 * empty list would make every parity check pass by having nothing to compare.
 */
export function schemaFields(collection: string): SchemaField[] {
  const definition = (collections as Record<string, any>)[collection];
  if (!definition) {
    throw new Error(
      `\`${collection}\` is not one of the collections declared in src/content.config.ts: ${Object.keys(collections).join(', ')}`,
    );
  }

  /* `eventi` and `relatori` declare their schema as a function, because they
     take `image` from Astro; `cicli` and `sedi` hand over the object itself. */
  const schema =
    typeof definition.schema === 'function' ? definition.schema({ image }) : definition.schema;

  return Object.entries(shapeOf(schema)).map(([name, value]) => describe(name, value));
}

/** The collection names, which is the other half of «and nothing in excess». */
export function schemaCollections(): string[] {
  return Object.keys(collections);
}
