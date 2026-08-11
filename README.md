# La Miniera Culturale in Periferia

Sito vetrina di un'associazione culturale di quartiere a Torino: il programma
delle serate, passate e future, in ordine cronologico. Cadenza settimanale,
circa 52 serate l'anno.

Astro statico, contenuti in git, [Sveltia](https://github.com/sveltia/sveltia-cms)
come CMS, Cloudflare Pages come hosting. Niente backend, niente database:
il repository *è* il progetto — contenuti, immagini, storico e specifica di
design compresi.

## Come si comincia

Serve **Node 24**, fissata in `.nvmrc`. Non serve nient'altro.

```bash
npm install
npm run dev
```

| Comando | Cosa fa |
|---|---|
| `npm run dev` | sviluppo su `localhost:4321` |
| `npm run build` | build statica in `dist/` |
| `npm run preview` | anteprima della build |
| `npm test` | guardie e test, con una build dentro |
| `npm run check` | `astro check`, typecheck |
| `npm run fonts:sync` | ricopia i caratteri dai pacchetti `@fontsource` |

`REUSE_DIST=1 npm test` salta la build quando `dist/` è già fresco.

## La documentazione sta in `docs/`

È la memoria del progetto: le decisioni prese, il perché di ognuna, e i vincoli
che non vanno riscoperti da capo. Leggila prima di lavorare al codice.

| Documento | Cosa contiene |
|---|---|
| [docs/README.md](docs/README.md) | indice e stato del lavoro |
| [docs/piano.md](docs/piano.md) | come si lavora, e i passi da fare in ordine: una PR ciascuno |
| [docs/architettura.md](docs/architettura.md) | stack, pubblicazione, build e rebuild |
| [docs/design.md](docs/design.md) | i file di design, il design system, i token |
| [docs/contenuti.md](docs/contenuti.md) | modello dati e regole editoriali |
| [docs/vincoli-tecnici.md](docs/vincoli-tecnici.md) | soglia browser, prestazioni, accessibilità, immagini |
| [docs/decisioni.md](docs/decisioni.md) | registro delle decisioni |
| [docs/questioni-aperte.md](docs/questioni-aperte.md) | cosa resta da decidere, e chi decide |

Le convenzioni per chi scrive codice — comprese le regole che è facile violare
senza accorgersene — stanno in [CLAUDE.md](CLAUDE.md).

## Tre regole di processo

Sono applicate dal repository, non lasciate alla buona volontà:

- **Su `main` non si spinge mai direttamente.** Ogni modifica passa da una PR,
  compresa quella di una riga.
- **Una PR si chiude solo con tutti i test verdi.** Un test rosso non si aggira
  e non si rimanda.
- **Il merge è sempre squash and merge.**
