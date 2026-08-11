import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Four collections. The three supporting ones — cicli, sedi, relatori — exist
 * because their values repeat from one event to the next: keeping them as text
 * fields inside the event would mean re-uploading the same photo at every
 * appearance and rewriting the same address eighty times, getting it wrong
 * sooner or later.
 *
 * What is NOT here, and deliberately so:
 * - past / upcoming: they are worked out from `date` at build time, never
 *   written by hand. A nightly rebuild keeps the site in step.
 * - a short date ("20 mar") and a long one ("giovedì 20 marzo, ore 21"): those
 *   are formattings of `date`, not data.
 * - the cycle name: it comes from the reference to the cycle.
 *
 * The collection names stay Italian — `eventi`, `cicli`, `sedi`, `relatori` —
 * against the rest of the language rule, and on purpose: they are the folders
 * an editor sees in the repository, and the only piece of the code that
 * reaches someone who does not write code. The field names below are English
 * because nobody meets them: in the CMS every field carries an Italian label.
 */

const hexColour = /^#[0-9a-fA-F]{6}$/;

/** Cycles are editorial labels, not periods: several can be open at the same
 *  time, and two consecutive events can belong to different cycles. Each
 *  carries its own colour, which becomes --accent. */
const cicli = defineCollection({
  loader: glob({ base: './src/content/cicli', pattern: '**/*.md' }),
  schema: z.object({
    number: z.number().int().positive(),
    name: z.string().min(1),
    // Six-digit hex. The five defaults of the design are in
    // src/styles/tokens/colors.css: they are tuned to equal lightness and
    // saturation on purpose, so that no cycle prevails over the others and the
    // contrast against the blue ground stays guaranteed. Straying far from
    // that breaks the tuning.
    color: z.string().regex(hexColour, 'Serve un esadecimale a 6 cifre, es. #f26419'),
  }),
});

const sedi = defineCollection({
  loader: glob({ base: './src/content/sedi', pattern: '**/*.md' }),
  schema: z.object({
    name: z.string().min(1),
    address: z.string().min(1),
    city: z.string().min(1),
    map: z.string().url().optional(),
  }),
});

const relatori = defineCollection({
  loader: glob({ base: './src/content/relatori', pattern: '**/*.md' }),
  schema: ({ image }) =>
    z.object({
      name: z.string().min(1),
      // The person's default role. A single event may override it, because a
      // role changes over time and an evening from 2025 has to show the one
      // held back then.
      role: z.string().min(1),
      photo: image().optional(),
    }),
});

const eventi = defineCollection({
  loader: glob({ base: './src/content/eventi', pattern: '**/*.md' }),
  schema: ({ image }) =>
    z.object({
      // The editorial number of the evening: it is the public URL (/81) and
      // the association assigns it when scheduling, not once the evening has
      // happened. It must NEVER be reassigned: a link already shared would
      // point at a different event. If two events ended up with the same
      // number the build fails by itself, because two routes would claim the
      // same path.
      number: z.number().int().positive(),

      title: z.string().min(1),
      kicker: z.string().optional(),

      // Start date and time. The event counts as past from midnight of the
      // following day, so that while it is under way it still reads as
      // upcoming.
      date: z.coerce.date(),

      cycle: reference('cicli'),
      format: z.enum(['incontro', 'proiezione', 'presentazione']),
      description: z.string().min(1),
      venue: reference('sedi'),

      speakers: z
        .array(
          z.object({
            person: reference('relatori'),
            role: z.string().optional(), // overrides the person's own
          }),
        )
        .default([]),

      // Theme photo of the evening (a poster for upcoming events, a shot from
      // the room for past ones). At most 1600px on the long side: the source
      // file stays in the repository for ever, even once you replace it.
      photo: image().optional(),

      // Past events only.
      attendance: z.number().int().nonnegative().optional(),

      // Recordings and related material. Usually three at most, but there is
      // no ceiling: the field is generic on purpose, it will not necessarily
      // stay YouTube.
      materials: z
        .array(
          z.object({
            label: z.string().min(1),
            url: z.string().url(),
          }),
        )
        .default([]),

      // A cancelled evening keeps its number and its page: whoever had already
      // shared /82 must not find a 404 there.
      cancelled: z.boolean().default(false),

      // Overrides the computed note ("Ingresso libero, posti limitati" /
      // "Puntata registrata in sala").
      note: z.string().optional(),
    }),
});

export const collections = { eventi, cicli, sedi, relatori };
