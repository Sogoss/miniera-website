# Piano di lavoro

Il sito si costruisce per passi numerati, uno per PR. Questo documento è
l'elenco dei passi, in ordine, con quello che ciascuno deve dimostrare prima di
poter essere chiuso.

Aggiornato all'11 agosto 2026.

## Come si lavora

1. **Il piano viene scritto per primo.** Prima del branch, prima della PR.
   Viene approvato, e il testo approvato diventa il corpo della PR.
2. **Un branch per PR**, che parte da `main` aggiornato. **Su `main` non si
   spinge mai direttamente**: ogni modifica passa da una PR, compresa quella di
   una riga e compresa la documentazione.
3. **Merge sempre in squash and merge.** Il repository è configurato perché sia
   l'unico metodo possibile: merge commit e rebase sono disabilitati, il branch
   viene cancellato dopo il merge.
4. **Ogni PR dichiara tre cose**: nome del branch, obiettivi da verificare prima
   della chiusura, test richiesti — automatici e manuali.
5. **Una PR si chiude solo con tutti i test verdi.** Un test rosso non si
   aggira, non si disattiva e non si rimanda alla PR successiva: o si sistema
   il codice, o si sistema il test perché era sbagliato — dicendo perché.
6. **Le decisioni si registrano nella PR che le prende**, in
   [decisioni.md](decisioni.md), e la voce corrispondente esce da
   [questioni-aperte.md](questioni-aperte.md).
7. Quando una PR viene chiusa, la sua riga qui sotto passa a *fatta*.

## Strategia di test

Il vincolo che decide l'impianto è in [vincoli-tecnici.md](vincoli-tecnici.md):
*per lo stile non basta guardare il sorgente, il minificatore può togliere
cose*. I test stanno quindi su due strati.

| Strato | Cosa verifica | Come |
|---|---|---|
| Unitario | la logica pura di `src/lib/` — date, fusi, ordinamento | vitest |
| Sulla build | quello che arriva davvero in `dist/`, HTML e CSS | build + asserzioni sui file prodotti |

Il secondo strato è dove vivono le **guardie ai vincoli**: sono l'unico posto
in cui le regole del [CLAUDE.md](../CLAUDE.md) sono verificabili sul serio,
perché parlano del file pubblicato e non del sorgente.

I test manuali non sono un ripiego: snap, scorrimento morbido su iOS e
anteprime social non sono verificabili in automatico, e l'emulazione non
sostituisce un telefono vero.

## Stato

| # | PR | Branch | Stato |
|---|---|---|---|
| 1 | Impianto di verifica | `impianto-verifiche` | da fare |
| 2 | Igiene: lingua, README, favicon, contenuti | `igiene-lingua-e-contenuti` | da fare |
| 3 | Utilità di dominio | `lib-eventi` | da fare |
| 4 | Accento dai cicli della collection | `accento-dai-cicli` | da fare |
| 5 | Layout di base e forme di ritaglio | `layout-base` | da fare |
| 6 | Gli otto componenti del design system | `design-system-astro` | da fare |
| 7 | Lo scroller del programma | `scroller-programma` | da fare |
| 8 | Timeline e navigazione da tastiera | `timeline` | da fare |
| 9 | Le pagine delle serate | `pagine-serata` | da fare |
| 10 | Modale di prenotazione | `modale-prenotazione` | da fare |
| 11 | Chi siamo, contatti, rassegna disabilitata | `pagine-istituzionali` | da fare |
| 12 | Sveltia CMS | `cms-sveltia` | da fare |
| 13 | Pubblicazione | `pubblicazione` | da fare |

Fuori dalla beta, bloccate da [questioni-aperte.md](questioni-aperte.md):
migrazione delle foto e caricamento delle 81 serate storiche.

---

## PR 1 — Impianto di verifica

**Branch:** `impianto-verifiche` · **Dipende da:** nulla

Senza questo, «ogni PR ha i suoi test» non ha dove esistere. Le guardie che
introduce automatizzano proprio le regole che il `CLAUDE.md` segnala come
facili da violare senza accorgersene.

### Obiettivi

- [ ] `npm test` esiste e gira in locale
- [ ] `astro check` passa senza errori di tipo
- [ ] La CI di GitHub Actions gira su ogni PR verso `main` ed esegue build,
      typecheck e test
- [ ] Ogni guardia è provata anche in negativo, con casi che devono fallire
- [ ] `.nvmrc` fissa la versione di Node, e la CI usa quella. Il lockfile viene
      rigenerato una volta con quel npm e `npm ci` smette di modificarlo: com'è
      committato oggi è disallineato dal `package.json` — tiene i pacchetti
      `@fontsource` fra le `dependencies` invece che fra le `devDependencies` —
      ed è stato generato con una versione di npm diversa

### Test automatici

- Il ripiego `--h-scena: 100vh` **e** il blocco `@supports (height: 100svh)`
  sono entrambi presenti nel CSS di `dist/` (regola 4)
- Nessun artefatto del runtime di Claude Design in `dist/`: `x-dc`, `sc-for`,
  `sc-if`, `x-import`, `image-slot`, `DCLogic`, `support.js` (regola 8)
- Nessun `color-mix(` né `oklch(` nei token e nel CSS pubblicato (regola 3)
- Ogni colore base che ha una terna `--*-rgb` è coerente con essa: si legge
  `colors.css`, si converte l'esadecimale, si confronta (regola 3, seconda
  metà — è la parte che nessuno si accorge di aver rotto)
- Nessuna dipendenza da Tailwind in `package.json` (regola 2)
- In CI, dopo `npm ci` il `package-lock.json` non risulta modificato

### Test manuali

- Aprire la PR e verificare che la CI parta e che un test rosso impedisca il
  merge
- Verificare che il repository rifiuti un push diretto su `main`, un merge
  commit e un rebase, e che il branch venga cancellato dopo lo squash
- Una volta che la CI ha girato per la prima volta, registrare il suo controllo
  fra quelli **obbligatori** per il merge: prima non esisteva un nome da
  richiedere

---

## PR 2 — Igiene: lingua, README, favicon, contenuti d'esempio

**Branch:** `igiene-lingua-e-contenuti` · **Dipende da:** 1

Nessun cambiamento di comportamento. Rende il repository coerente con le regole
che si è dato.

### Obiettivi

- [ ] Gli accenti sono ripristinati nei commenti di `src/`, `scripts/` e
      `astro.config.mjs` — *perché*, *già*, *così*, *più*, *può*, *è*
- [ ] `README.md` alla radice non è più il template «Astro Starter Kit» e
      rimanda a `docs/`
- [ ] La favicon viene dal marchio e non da Astro, in `.svg` e `.ico`
- [ ] Esiste `src/content/relatori/piergiorgio-rosso.md` e la serata 81 non
      elenca più due volte la stessa persona
- [ ] La serata 81 non ha più un `occhiello` che ripete il nome del ciclo
- [ ] `npm run build` continua a passare

### Test automatici

- Una lista di parole senza accento è vietata in `src/` e `scripts/`
- Nessun evento elenca due volte la stessa persona fra i relatori
- L'`occhiello` di un evento non contiene il nome del ciclo a cui appartiene

### Test manuali

- La favicon si legge nella linguetta del browser, su tema chiaro e su tema
  scuro
- Il `README.md` si legge bene nell'interfaccia di GitHub

---

## PR 3 — Utilità di dominio

**Branch:** `lib-eventi` · **Dipende da:** 1

`src/lib/eventi.ts`: il cuore logico del sito, puro e testabile, che tutte le
pagine useranno.

### Obiettivi

- [ ] Ordinamento cronologico degli eventi
- [ ] `passato` / `futuro` calcolati **in `Europe/Rome`**: una serata diventa
      già svolta alla mezzanotte del giorno successivo, non all'ora di inizio
- [ ] Formattazione italiana delle date: `24 set` per la Timeline,
      `giovedì 24 settembre, ore 21` per la scena
- [ ] Risoluzione dei riferimenti a ciclo, sede e relatori, con il ruolo
      dell'evento che sovrascrive quello della persona
- [ ] Nota predefinita calcolata — *Ingresso libero, posti limitati* /
      *Puntata registrata in sala* — sovrascrivibile dal campo `nota`
- [ ] Indice della prima serata futura, su cui si aprirà lo scroller
- [ ] Un controllo alla build fallisce se l'ordine per `numero` e l'ordine per
      `data` divergono

### Test automatici

- Una serata alle 21 di giovedì è ancora *in programma* alle 23:59 di giovedì
- La stessa serata è *già svolta* alle 00:00 di venerdì, ora italiana
- Il passaggio all'ora legale e a quella solare non sposta il confine
- Una build eseguita con `TZ=UTC` dà lo stesso risultato di una eseguita con
  `TZ=Europe/Rome` — è il caso reale, perché Cloudflare builda in UTC
- Il ruolo dichiarato sull'evento vince su quello della persona; se manca, vale
  quello della persona
- Una serata annullata resta nell'elenco e conserva il suo numero
- Ordine per `numero` e ordine per `data` coincidono

### Test manuali

- Lettura a campione delle stringhe di data generate: maiuscole, preposizioni,
  nessun anno dove il design non lo prevede

---

## PR 4 — Accento dai cicli della collection

**Branch:** `accento-dai-cicli` · **Dipende da:** 3

Il ponte che oggi manca fra `src/content/cicli/` e `--accento`. Serve prima
dello scroller, che cambia accento a ogni serata.

### Obiettivi

- [ ] Le regole `[data-ciclo="N"] { --accento; --accento-rgb }` sono emesse
      alla build da ogni ciclo presente nella collection
- [ ] I cinque colori di `colors.css` restano come valori predefiniti
      dichiarati, non come unica fonte
- [ ] Nessun `color-mix()` introdotto per ricavare le trasparenze dell'accento

### Test automatici

- Un ciclo il cui colore differisce dal predefinito arriva col colore giusto
  nel CSS di `dist/`
- Un ciclo con numero oltre il quinto ottiene il suo accento
- La conversione esadecimale → terna `rgb` è corretta, compresi i valori con
  componenti a zero
- Le guardie della PR 1 continuano a passare

### Test manuali

- Cambiare il colore di un ciclo nel suo file e vedere l'accento cambiare in
  `npm run dev`

---

## PR 5 — Layout di base e forme di ritaglio

**Branch:** `layout-base` · **Dipende da:** 4

### Obiettivi

- [ ] `src/layouts/Base.astro`: `lang="it"`, meta, Open Graph e Twitter,
      `global.css`, slot
- [ ] Link «salta al programma», visibile quando riceve la messa a fuoco
- [ ] `src/components/FormeRitaglio.astro` con i `<clipPath>` del design, da
      includere una volta in ogni pagina che li usa
- [ ] La pagina provvisoria continua a funzionare sopra il nuovo layout

### Test automatici

- Ogni pagina prodotta ha `lang="it"` e un solo `<h1>`
- Ogni `clip-path: url(#…)` presente in una pagina trova il suo `id` nella
  stessa pagina
- I meta Open Graph di base ci sono

### Test manuali

- Il link «salta al programma» si raggiunge col primo Tab ed è visibile
- Le forme di ritaglio rendono come nell'anteprima del design aperta in locale

---

## PR 6 — Gli otto componenti del design system

**Branch:** `design-system-astro` · **Dipende da:** 5

`Bottone` · `Etichetta` · `Scheda` · `Marchio` · `FasciaFirma` ·
`BadgePuntata` · `RigaOspite` · `SchedaEvento`, portati da React a `.astro`.

### Obiettivi

- [ ] Gli otto componenti esistono in `src/components/`, nessuna isola React
- [ ] `Bottone` replica l'effetto premuto con `:active`, senza JavaScript
- [ ] `Marchio` **non ha la prop `forma`**: la variante breve non esiste, così
      non può essere usata per sbaglio. Nell'export era comunque muta —
      restituiva lo stesso testo dell'estesa
- [ ] Gli stili stanno nei `<style>` dei componenti e usano i token, non valori
      grezzi
- [ ] Una pagina di rassegna interna mostra tutti i componenti e le loro
      varianti

### Test automatici

- Dovunque compaia il marchio compare la scritta «in Periferia»
- Le varianti di `Bottone` e `Etichetta` rendono i token attesi
- Nessun valore colore grezzo nei componenti: solo `var(--…)`
- Nessuna dipendenza React entra nel bundle prodotto

### Test manuali

- Confronto a schermo con `design-export/sito-miniera.dc.html` aperto in
  locale, componente per componente
- L'effetto premuto del bottone funziona col mouse e col dito

---

## PR 7 — Lo scroller del programma

**Branch:** `scroller-programma` · **Dipende da:** 6

Sostituisce la pagina provvisoria. Solo le scene: la Timeline è la PR dopo.

### Obiettivi

- [ ] `/` è lo scroller a scroll-snap, con una sezione alta `--h-scena` per
      serata
- [ ] Si apre sulla prima serata futura
- [ ] `content-visibility: auto` e `contain-intrinsic-size` sulle sezioni,
      `loading="lazy"` sulle immagini oltre le prime
- [ ] L'accento segue il ciclo della serata a schermo
- [ ] Titoli delle serate in `<h2>`, un solo `<h1>` di pagina
- [ ] Layout responsive: due colonne su desktop, una su mobile con la foto in
      alto; testo sempre allineato a sinistra
- [ ] La pagina provvisoria è stata rimossa, non estesa

### Test automatici

- Tante sezioni quanti sono gli eventi, nell'ordine giusto
- Un solo `<h1>` nella pagina
- Ogni sezione ha `scroll-snap-align` e un'altezza intrinseca dichiarata
- L'accento di ogni sezione corrisponde al ciclo del suo evento
- Le immagini oltre la prima sono in `loading="lazy"`
- Le guardie della PR 1 continuano a passare

### Test manuali

- **Su un iPhone vero**: lo snap non salta quando la barra degli indirizzi di
  Safari si ritrae; la posizione di apertura è esatta
- Su Android, stesso giro
- Con *movimento ridotto* attivo lo scroller diventa una lista che si scorre
  normalmente
- Con un contenuto finto da 81 serate, la pagina resta fluida su un telefono di
  qualche anno fa — è la misura rimandata in `vincoli-tecnici.md`

---

## PR 8 — Timeline e navigazione da tastiera

**Branch:** `timeline` · **Dipende da:** 7

### Obiettivi

- [ ] Timeline verticale a destra su desktop, orizzontale in basso su mobile
- [ ] Nessun divisore «oggi», come deciso
- [ ] Token nuovi per le tacche: nell'export erano `color-mix` al 60% e al 34%
      sul crema, e oggi non hanno un equivalente
- [ ] `aria-current` sulla tacca della serata a schermo
- [ ] Navigazione da tastiera: frecce, PagSu/PagGiù, Home/Fine
- [ ] Guardia `bersaglio` con timer da 1200 ms sullo scorrimento morbido, come
      nel codice del design

### Test automatici

- Tante tacche quanti sono gli eventi, e `aria-current` su una sola
- I token nuovi esistono e nessun `color-mix` è rientrato
- Sotto `prefers-reduced-motion` il CSS pubblicato azzera scroll-snap e
  scorrimento morbido

### Test manuali

- **Su un iPhone vero**: toccare una tacca lontana e verificare che lo
  scorrimento morbido arrivi a destinazione senza essere interrotto dallo snap
- Tastiera completa su desktop, con la messa a fuoco sempre visibile
- Uno screen reader annuncia la serata corrente

---

## PR 9 — Le pagine delle serate

**Branch:** `pagine-serata` · **Dipende da:** 6

Sono la mitigazione strutturale dello scroll-snap: chi non riesce a usare lo
scroller ha comunque accesso completo ai contenuti.

### Obiettivi

- [ ] Rotta `/[numero]`, una pagina per serata, con il titolo in `<h1>`
- [ ] Meta Open Graph con la foto tema — è il motivo per cui queste pagine
      esistono
- [ ] Una serata annullata conserva pagina e numero, e mostra il suo stato
- [ ] Dallo scroller si arriva alla pagina della serata

### Test automatici

- Una pagina per ogni evento, e `/81` esiste
- Un solo `<h1>` per pagina
- I meta Open Graph e Twitter ci sono e riportano titolo, descrizione e foto
- Due eventi con lo stesso numero fanno fallire la build

### Test manuali

- Anteprima di un link su WhatsApp e su Facebook: titolo e foto compaiono
- La pagina di una serata annullata si legge e non sembra un errore

---

## PR 10 — Modale di prenotazione

**Branch:** `modale-prenotazione` · **Dipende da:** 9

### Obiettivi

- [ ] **Un solo** modale nel DOM, riusato da tutte le serate future dello
      scroller — non uno per serata
- [ ] Contiene l'informazione reale: sessanta posti, si scrive su WhatsApp con
      nome e numero di persone, risposta entro sera
- [ ] Link `wa.me` al numero configurato in un posto solo
- [ ] Si chiude con Esc e con un clic fuori; la messa a fuoco resta dentro e
      torna al bottone che l'ha aperto
- [ ] Presente su entrambe le larghezze, come deciso

### Test automatici

- Il modale è unico nel documento
- Compare solo se esiste almeno una serata futura
- Il link punta al numero configurato e non a un valore scritto a mano

### Test manuali

- Esc, clic fuori, e ritorno della messa a fuoco
- Sul telefono, il link apre davvero WhatsApp con il messaggio precompilato

---

## PR 11 — Chi siamo, contatti, rassegna disabilitata

**Branch:** `pagine-istituzionali` · **Dipende da:** 6

### Obiettivi

- [ ] `/chi-siamo`: manifesto, come nasce, valori, persone, sede, numeri
- [ ] `/contatti`
- [ ] `/rassegna` resta «Coming soon», visibile in navigazione ma non attiva
- [ ] L'indirizzo è **Palazzo ex Venchi Unica, Piazza Massaua 17/b, Torino** in
      ogni punto: nei file di design ne compaiono tre versioni incoerenti e
      nessuna è quella buona

### Test automatici

- Le pagine esistono e hanno un solo `<h1>` ciascuna
- La voce «Rassegna stampa» non è un collegamento attivo
- Nessuna occorrenza di «Fratelli Rosselli» in `dist/`

### Test manuali

- Confronto con il design, sezione per sezione
- Le due pagine si leggono bene su schermo stretto

---

## PR 12 — Sveltia CMS

**Branch:** `cms-sveltia` · **Dipende da:** 9

### Obiettivi

- [ ] `public/admin/` configurato con le quattro collection e i loro campi
- [ ] Autenticazione con GitHub funzionante
- [ ] Ridimensionamento delle immagini al caricamento: 1600px sul lato lungo
      per le foto tema, 800×800 per i ritratti
- [ ] Un redattore riesce a creare una serata senza sapere che esiste git

### Test automatici

- Il `config.yml` copre tutti i campi dello schema Zod e nessuno in più — è il
  test che impedisce la deriva fra CMS e schema, che altrimenti si scopre in
  produzione
- I campi obbligatori nello schema sono obbligatori anche nel CMS

### Test manuali

- Accesso a `/admin`, login con GitHub
- Creazione di una serata di prova dal CMS: il commit compare nel repository e
  la build parte
- Caricamento di una foto grande: viene ridimensionata prima del commit

---

## PR 13 — Pubblicazione

**Branch:** `pubblicazione` · **Dipende da:** 12

### Obiettivi

- [ ] Progetto collegato a Cloudflare Pages, build a ogni commit
- [ ] Rebuild notturno alle 03:00 italiane
- [ ] `site` impostato in `astro.config.mjs` quando il dominio esiste, con
      sitemap e URL canonici
- [ ] Misurato il numero di file per deployment con le foto vere, come deciso
      in `vincoli-tecnici.md`

### Test automatici

- Con `site` impostato, gli URL canonici e i meta Open Graph sono assoluti
- La sitemap elenca tutte le pagine delle serate

### Test manuali

- Un commit sul `main` pubblica entro pochi minuti
- Il rebuild notturno scatta e sposta davvero una serata da *in programma* a
  *già svolta*
- Anteprima di un link con il dominio vero
