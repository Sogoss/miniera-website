# La Miniera Culturale in Periferia — istruzioni di progetto

Sito vetrina di un'associazione culturale di quartiere: il programma delle
serate, passate e future. Astro statico, contenuti in git, Sveltia come CMS,
Cloudflare Pages come hosting.

**La documentazione completa è in [`docs/`](docs/).** Leggi
[`docs/README.md`](docs/README.md) prima di iniziare a lavorare, e il
documento specifico dell'area che stai toccando. Le decisioni prese e il
perché di ciascuna stanno in [`docs/decisioni.md`](docs/decisioni.md): se
qualcosa nel codice sembra una scelta strana, il motivo è quasi sempre lì.

## Come si lavora

Il sito si costruisce per passi numerati, uno per PR, nell'ordine fissato in
[`docs/piano.md`](docs/piano.md). Per ciascuna PR, in quest'ordine:

1. **Il piano si scrive per primo**, prima del branch e prima della PR, e va
   approvato. Il testo approvato diventa il corpo della PR.
2. Solo dopo si crea il branch e si scrive il codice.

Ogni PR dichiara tre cose: **nome del branch**, **obiettivi da verificare prima
della chiusura**, **test richiesti — automatici e manuali**.

Tre regole senza eccezioni, applicate dal repository e non lasciate alla buona
volontà:

- **Su `main` non si spinge mai direttamente.** Ogni modifica passa da una PR,
  compresa quella di una riga e compresa la documentazione.
- **Una PR si chiude solo con tutti i test verdi.** Un test rosso non si
  aggira, non si disattiva e non si rimanda alla PR dopo: o si sistema il
  codice, o si sistema il test perché era sbagliato — dicendo perché.
- **Il merge è sempre squash and merge.** Merge commit e rebase sono
  disabilitati.

## Regole che è facile violare senza accorgersene

Sono tutte già state discusse e decise. Rivederle richiede una ragione nuova,
non una preferenza.

1. **Lo scroll-snap a schermo pieno è un requisito del committente.** Non è
   una scelta di design rinegoziabile. Non proporre di sostituirlo con una
   lista eventi più pagina di dettaglio: i suoi problemi — rendering,
   deep-link, SEO, accessibilità — si risolvono *dentro* il vincolo.

2. **Niente Tailwind.** È stato rimosso apposta. Lo stile si scrive con i
   token in `src/styles/tokens/`.

3. **Niente `color-mix()` e niente `oklch()`.** Sono stati eliminati dai token
   per abbassare la soglia dei browser. Per le trasparenze si usa
   `rgba(var(--crema-100-rgb), 0.68)` e simili. Se cambi un colore di base,
   **cambia anche la sua terna `--*-rgb`**.

4. **I ripieghi CSS si dichiarano in `@supports`, mai come doppia
   dichiarazione.** Il minificatore collassa la doppia dichiarazione e il
   ripiego non arriva mai in produzione. È già successo.

5. **`svh`, non `dvh`.** Usa il token `--h-scena`. Con `dvh` la ritrazione
   della barra di Safari fa saltare le posizioni di snap.

6. **Non "sistemare" `font-weight: 400 900` su Archivo Black** in
   `src/styles/tokens/fonts.css`. È un peso unico dichiarato come intervallo
   apposta, per evitare il grassetto sintetico sui titoli.

7. **Il marchio va sempre nella forma estesa**, con la scritta "in Periferia".
   La variante breve non si usa mai, navigazione mobile inclusa: se lo spazio
   è poco si riduce l'altezza, non si taglia la firma.

8. **Niente del runtime di Claude Design va in produzione**: `<x-dc>`,
   `<sc-for>`, `<sc-if>`, `<x-import>`, `<image-slot>`, `DCLogic`,
   `support.js`. I file in `design-export/` sono la **specifica da tradurre**,
   non codice da riusare.

9. **I componenti del design system si scrivono in `.astro`, non come isole
   React.** Sono presentazionali; l'unico con stato si replica con `:active`.

10. **Il numero della serata è il suo URL e non si riassegna mai.**
    `passato` / `futuro` non sono campi: si calcolano da `data` alla build.

## Lingua

Tutto in italiano: contenuti, commenti, nomi dei componenti e dei campi. Il
design system usa nomi italiani — `Bottone`, `Etichetta`, `Scheda`, `Marchio`,
`FasciaFirma`, `BadgePuntata`, `RigaOspite`, `SchedaEvento`. L'unica eccezione
concordata è `Timeline`, il componente di navigazione laterale (nei file di
design è chiamato "binario").

Accenti e caratteri speciali vanno scritti per intero: *perché*, non *perche*.

## Dove sta cosa

```
design-export/     export di Claude Design — la specifica, non si spedisce
docs/              documentazione di progetto
scripts/           utilità (sincronizzazione dei caratteri)
src/assets/fonts/  woff2 self-hostati e licenze OFL
src/content/       eventi, cicli, sedi, relatori
src/content.config.ts   schema Zod delle quattro collection
src/styles/tokens/ i token del design
src/styles/global.css   strato base del documento
```

`src/pages/index.astro` è una **pagina di verifica provvisoria**: dimostra che
token, caratteri e collection funzionano insieme. Va sostituita dallo scroller
vero, non estesa.

## Comandi

```bash
npm run dev          # sviluppo
npm run build        # build statica in dist/
npm run preview      # anteprima della build
npm run fonts:sync   # ricopia i caratteri dai pacchetti @fontsource
```

Per il server di sviluppo in background e i riferimenti alla documentazione di
Astro, vedi [`AGENTS.md`](AGENTS.md).

## Come verificare il lavoro

`npm run build` deve passare. Ma per lo stile **non basta guardare il
sorgente**: il minificatore può togliere cose. Controlla il CSS in `dist/`
quando tocchi ripieghi, `@supports` o dichiarazioni condizionali.
