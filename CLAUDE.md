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
   `rgba(var(--cream-100-rgb), 0.68)` e simili. Se cambi un colore di base,
   **cambia anche la sua terna `--*-rgb`**.

4. **I ripieghi CSS si dichiarano in `@supports`, mai come doppia
   dichiarazione.** Il minificatore collassa la doppia dichiarazione e il
   ripiego non arriva mai in produzione. È già successo.

5. **`svh`, non `dvh`.** Usa il token `--scene-height`. Con `dvh` la ritrazione
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
    Passato e futuro non sono campi: si calcolano da `date` alla build.
    L'ordine del sito è il numero, non la data; se i due ordini divergono la
    build si ferma.

11. **Ogni data si formatta dichiarando `timeZone: 'Europe/Rome'`**, i moduli
    puri di `src/lib/` non leggono l'orologio — `now` arriva sempre come
    argomento, e l'unico a crearlo è `programme.ts`, una volta per build — e non
    si usano i metodi locali di `Date`: `getHours`, `getMinutes`, `getSeconds`,
    `getDay`, `getDate`, `getMonth`, `getFullYear`, `toDateString`,
    `toTimeString`. Sono i nove che la guardia vieta, ed è l'elenco intero: non
    hanno un'opzione per dichiarare il fuso. `getTime()` e la famiglia
    `getUTC…` invece vanno bene, perché dicono la stessa cosa su ogni macchina.
    **E una `Date` non si dà mai in pasto a qualcosa che si aspetta una
    stringa** — `{scene.date}`, `${event.date}` — perché è un `toString()` che
    nessuna guardia sulla forma della chiamata può distinguere: le stringhe le
    scrive `src/lib/events.ts`. Cloudflare builda in UTC e le serate si svolgono
    a Torino: una formattazione senza fuso è giusta sul portatile di chi la
    scrive e pubblica *ore 19* al posto di *ore 21*. Quattro guardie in
    `test/guards/dates.ts` — le prime tre leggono il codice, la quarta il testo
    pubblicato in `dist/`. La build gira con `TZ=UTC`, fissato nello script
    `build`: è il fuso di Cloudflare, e senza quel vincolo un `dist/` costruito
    a Torino e riusato con `REUSE_DIST=1` passerebbe per il motivo sbagliato.
    **E lo stesso vincolo vale nei contenuti: il campo `date` porta sempre il
    suo scostamento** — `+02:00` d'estate, `+01:00` d'inverno. Senza, lo legge
    la macchina che builda, cioè UTC, e una serata delle 21 si pubblica *ore
    22*: `checkDateHasOffset` in `test/guards/content.ts`.

12. **Le regole `[data-cycle]` non si scrivono a mano.** L'accento di un ciclo
    sta nel suo file in `src/content/cicli/` e diventa CSS alla build —
    `src/lib/cycles.ts`, emesso dal componente `CycleAccents`. I cinque
    `--cycle-N` di `colors.css` restano dichiarati come palette di riferimento e
    nessuna regola li legge più: una copia scritta a mano avrebbe la stessa
    specificità di quella emessa, quindi a decidere il colore del sito sarebbe
    l'ordine dei fogli. **E una pagina che porta `data-cycle` deve portarsi
    anche le regole**: senza `CycleAccents` ogni serata resta sull'arancio di
    `:root`, che è una pagina giusta del colore sbagliato. Due guardie in
    `test/guards/cycles.ts`: la prima legge il sorgente — in `dist/` le regole
    emesse ci sono per costruzione — la seconda le pagine pubblicate, perché nel
    sorgente `data-cycle={n}` è un'espressione. Due cicli con lo stesso numero
    fermano la build: il numero è il nome del ciclo nel CSS.

## Lingua

Due lingue, separate da un confine netto: **il codice è in inglese, quello che
si legge è in italiano.**

**In inglese** tutto ciò che sta nel codice: nomi di file, cartelle, variabili,
funzioni, componenti, proprietà personalizzate CSS, campi dello schema — **e i
commenti**. Il design system usa quindi `Button`, `Label`, `Card`, `Brand`,
`SignatureBand`, `EpisodeBadge`, `GuestRow`, `EventCard`, `Timeline`.

**In italiano** tutto ciò che arriva a un lettore: i contenuti in
`src/content/`, le stringhe visibili nelle pagine, le etichette del CMS, questa
documentazione e i messaggi di commit.

Nei testi italiani accenti e caratteri speciali vanno scritti per intero:
*perché*, non *perche*. Non lo verifica nessuna guardia: si legge — vedi
[`docs/decisioni.md`](docs/decisioni.md).

**Un'eccezione sola, e dichiarata: i nomi delle quattro collection restano in
italiano** — `eventi`, `cicli`, `sedi`, `relatori`, cartelle e chiavi. Sono
l'unico pezzo di codice che si trova davanti chi redige i contenuti senza
scrivere codice. I *campi* dentro quei file sono in inglese, perché nessuno li
incontra: nel CMS ogni campo porta la sua etichetta italiana.

> La regola sulla lingua è stata scritta quando il progetto era già cominciato,
> e il codice che la precedeva — token CSS, campi dello schema, commenti in
> `src/` e `scripts/` — è stato tradotto nella PR 2. Non resta niente da
> migrare: il codice esistente è di nuovo il modello da imitare.

## Dove sta cosa

```
design-export/     export di Claude Design — la specifica, non si spedisce
docs/              documentazione di progetto
scripts/           utilità (sincronizzazione dei caratteri)
src/assets/fonts/  woff2 self-hostati e licenze OFL
src/components/    i componenti .astro
src/content/       eventi, cicli, sedi, relatori
src/content.config.ts   schema Zod delle quattro collection
src/lib/           il dominio: events.ts e cycles.ts puri, programme.ts legge
                   le collection
src/styles/tokens/ i token del design
src/styles/global.css   strato base del documento
test/guards/       le guardie ai vincoli, come funzioni pure
test/unit/         i loro test, positivi e negativi
test/build/        le asserzioni su ciò che finisce in dist/
```

`src/pages/index.astro` è una **pagina di verifica provvisoria**: dimostra che
token, caratteri, collection e utilità di dominio funzionano insieme. Va
sostituita dallo scroller vero, non estesa — con un'eccezione dichiarata, che
vale la pena conoscere prima della PR 7.

È anche **l'unica prova pubblicata che lo strato `build` può leggere**, e per
questo porta su ogni serata tre ancoraggi che non sono decorazione:
`data-number`, `data-state` e `data-open` sulla scena di apertura. Le
asserzioni di `test/build/published-dates.test.ts` cercano quelli e i contenuti
— il nome del ciclo, quello della sede, la nota del dominio — mai il `#78 · `
o l'*apertura dello scroller* che questa pagina scrive intorno. Sostituirla
vuol dire riportare i tre attributi sullo scroller e mostrare le stesse cose,
non riscrivere le prove sul fuso. Tutto il resto di questa pagina si butta.

Porta anche `<CycleAccents />` nel `<head>` e `data-cycle` su ogni serata, che
è il quarto attributo e l'unico che ha bisogno di compagnia: finché il layout
della PR 5 non esiste, le regole dell'accento viaggiano con la pagina che le
usa. Da lì in poi stanno nel layout e nessuna pagina deve ricordarsene — ma la
guardia continua a chiederlo a ognuna.

## Comandi

Serve **Node 24** — la versione è fissata in `.nvmrc`, e `engine-strict` fa
fallire l'installazione con una versione diversa invece di riscrivere di
nascosto il `package-lock.json`.

```bash
npm run dev          # sviluppo
npm run build        # build statica in dist/
npm run preview      # anteprima della build
npm test             # guardie e test, con una build dentro
npm run check        # astro check, typecheck
npm run fonts:sync   # ricopia i caratteri dai pacchetti @fontsource
npm run favicon:build  # rigenera public/favicon.ico da public/favicon.svg —
                       # lo fa già `npm run build`, e un test lo pretende
```

`REUSE_DIST=1 npm test` salta la build quando `dist/` è già fresco.

Per il server di sviluppo in background e i riferimenti alla documentazione di
Astro, vedi [`AGENTS.md`](AGENTS.md).

## Come verificare il lavoro

`npm test` e `npm run check` devono passare. Per lo stile **non basta guardare
il sorgente**: il minificatore può togliere cose, ed è già successo. Le
asserzioni in `test/build/` leggono il CSS in `dist/`, che è l'unico posto dove
la perdita si vede.

Quando aggiungi una regola ai vincoli, aggiungi la sua guardia in
`test/guards/` **e il test che la fa fallire**: una guardia che non è mai stata
vista scattare non si distingue da una che non sta guardando.
