import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Quattro collection. Le tre di supporto — cicli, sedi, relatori — esistono
 * perche i loro valori si ripetono fra un evento e l'altro: tenerle come campi
 * di testo dentro l'evento significherebbe ricaricare la stessa foto a ogni
 * partecipazione e riscrivere lo stesso indirizzo ottanta volte, sbagliandolo
 * prima o poi.
 *
 * Quello che NON sta qui, ed e voluto:
 * - `passato` / `futuro`: si calcolano da `data` al momento della build, non
 *   si scrivono a mano. Un rebuild notturno tiene il sito allineato.
 * - `dataBreve` ("20 mar") e la data distesa ("giovedi 20 marzo, ore 21"):
 *   sono formattazioni di `data`, non dati.
 * - `nomeCiclo`: viene dal riferimento al ciclo.
 */

const esadecimale = /^#[0-9a-fA-F]{6}$/;

/** I cicli sono etichette editoriali, non periodi: piu cicli possono essere
 *  aperti in contemporanea, e due eventi consecutivi possono appartenere a
 *  cicli diversi. Ognuno porta il proprio colore, che diventa `--accento`. */
const cicli = defineCollection({
  loader: glob({ base: './src/content/cicli', pattern: '**/*.md' }),
  schema: z.object({
    numero: z.number().int().positive(),
    nome: z.string().min(1),
    // Esadecimale a sei cifre. I cinque colori predefiniti del design sono in
    // src/styles/tokens/colors.css: sono tarati a luminosita e saturazione
    // uguali apposta, perche nessun ciclo prevalga sugli altri e il contrasto
    // sul fondo blu resti garantito. Discostarsene molto rompe quella taratura.
    colore: z.string().regex(esadecimale, 'Serve un esadecimale a 6 cifre, es. #f26419'),
  }),
});

const sedi = defineCollection({
  loader: glob({ base: './src/content/sedi', pattern: '**/*.md' }),
  schema: z.object({
    nome: z.string().min(1),
    indirizzo: z.string().min(1),
    citta: z.string().min(1),
    mappa: z.string().url().optional(),
  }),
});

const relatori = defineCollection({
  loader: glob({ base: './src/content/relatori', pattern: '**/*.md' }),
  schema: ({ image }) =>
    z.object({
      nome: z.string().min(1),
      // Ruolo predefinito della persona. Il singolo evento puo sovrascriverlo,
      // perche un ruolo cambia nel tempo e in una serata del 2025 va mostrato
      // quello di allora.
      ruolo: z.string().min(1),
      foto: image().optional(),
    }),
});

const eventi = defineCollection({
  loader: glob({ base: './src/content/eventi', pattern: '**/*.md' }),
  schema: ({ image }) =>
    z.object({
      // Il numero editoriale della serata: e l'URL pubblico (/81) e
      // l'associazione lo assegna alla programmazione, non a serata avvenuta.
      // Non va MAI riassegnato: un link gia condiviso punterebbe a un evento
      // diverso. Se due eventi finissero con lo stesso numero la build fallisce
      // da sola, perche due rotte reclamerebbero lo stesso percorso.
      numero: z.number().int().positive(),

      titolo: z.string().min(1),
      occhiello: z.string().optional(),

      // Data e ora di inizio. L'evento risulta "gia svolto" dalla mezzanotte
      // del giorno successivo, cosi a serata in corso resta "in programma".
      data: z.coerce.date(),

      ciclo: reference('cicli'),
      formato: z.enum(['incontro', 'proiezione', 'presentazione']),
      descrizione: z.string().min(1),
      sede: reference('sedi'),

      relatori: z
        .array(
          z.object({
            persona: reference('relatori'),
            ruolo: z.string().optional(), // sovrascrive quello della persona
          }),
        )
        .default([]),

      // Foto tema della serata (locandina per gli eventi futuri, scatto in sala
      // per quelli passati). Massimo 1600px sul lato lungo: il file sorgente
      // resta nel repo per sempre, anche se poi lo sostituisci.
      foto: image().optional(),

      // Solo per gli eventi passati.
      presenze: z.number().int().nonnegative().optional(),

      // Registrazioni e interventi. Di solito al massimo tre, ma non mettiamo
      // un tetto: il campo e generico apposta, non e detto che resti YouTube.
      interventi: z
        .array(
          z.object({
            etichetta: z.string().min(1),
            url: z.string().url(),
          }),
        )
        .default([]),

      // Una serata annullata conserva il suo numero e la sua pagina: chi aveva
      // gia condiviso /82 non deve trovarci un 404.
      annullato: z.boolean().default(false),

      // Sovrascrive la nota calcolata ("Ingresso libero, posti limitati" /
      // "Puntata registrata in sala").
      nota: z.string().optional(),
    }),
});

export const collections = { eventi, cicli, sedi, relatori };
