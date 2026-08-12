# Piano di lavoro

Il sito si costruisce per passi numerati, uno per PR. Questo documento è
l'elenco dei passi, in ordine, con quello che ciascuno deve dimostrare prima di
poter essere chiuso.

Aggiornato al 12 agosto 2026.

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
| `unit` | le guardie su fixture rotte, e la logica pura di `src/lib/` — date, fusi, ordinamento | vitest, meno di un secondo |
| `build` | quello che arriva davvero in `dist/`, HTML e CSS | una build per suite, poi asserzioni sui file prodotti |

Il secondo strato è dove vivono le **guardie ai vincoli**: sono l'unico posto
in cui le regole del [CLAUDE.md](../CLAUDE.md) sono verificabili sul serio,
perché parlano del file pubblicato e non del sorgente.

Le guardie sono **funzioni pure** in `test/guards/`: prendono una stringa e
restituiscono l'elenco delle violazioni. È questa forma che permette di
provarle anche in negativo nello strato `unit`, passando loro un file rotto
scritto a mano — senza dover far girare in CI una build deliberatamente
sbagliata. Una guardia che non è mai stata vista scattare non si distingue da
una che non sta guardando.

I test manuali non sono un ripiego: snap, scorrimento morbido su iOS e
anteprime social non sono verificabili in automatico, e l'emulazione non
sostituisce un telefono vero.

## Stato

| # | PR | Branch | Stato |
|---|---|---|---|
| 1 | Impianto di verifica | `impianto-verifiche` | fatta |
| 2 | Igiene: lingua, README, favicon, contenuti | `igiene-lingua-e-contenuti` | fatta |
| 3 | Utilità di dominio | `lib-eventi` | fatta |
| 4 | Accento dai cicli della collection | `accento-dai-cicli` | fatta |
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

- [x] `npm test` esiste e gira in locale
- [x] `astro check` passa senza errori di tipo
- [x] La CI di GitHub Actions gira su ogni PR verso `main` ed esegue build,
      typecheck e test
- [x] Ogni guardia è provata anche in negativo, con casi che devono fallire
- [x] `.nvmrc` fissa la versione di Node — **la 24** — e la CI usa quella. Il
      lockfile viene rigenerato una volta con quel npm: com'era committato
      teneva i pacchetti `@fontsource` fra le `dependencies` invece che fra le
      `devDependencies`, ed era stato generato con una versione di npm diversa

> **Corretto in corsa.** Questo punto diceva anche «e `npm ci` smette di
> modificarlo». Era un malinteso: `npm ci` **non riscrive mai** il lockfile,
> quindi da solo non può accorgersi di nulla e l'obiettivo era già vero per
> costruzione. Il difetto reale era un altro e si è verificato: `npm ci
> --omit=dev` installava i `@fontsource` come dipendenze di produzione. Il
> controllo che intercetta davvero la deriva è rigenerare il lockfile e
> confrontarlo, ed è quello che fa la CI.

> **Aggiunto in revisione.** La revisione della PR ha trovato due buchi e una
> regola scoperta, tutti chiusi qui. Le guardie sullo stile leggevano solo
> `src/styles/**/*.css`: una doppia dichiarazione scritta nel `<style>` di un
> componente passava con la suite tutta verde, ed è esattamente dove gli stili
> andranno a stare dalla PR 6 in poi. `checkRgbTriples` indicizzava i colori
> sull'intero foglio con l'ultima dichiarazione che vinceva, e avrebbe
> cominciato a mentire alla PR 4. La regola 6 non aveva guardia, pur essendo
> l'unica del `CLAUDE.md` che qualcuno viola credendo di fare manutenzione.

### Test automatici

- Il ripiego `--scene-height: 100vh` **e** il blocco `@supports (height: 100svh)`
  sono entrambi presenti nel CSS di `dist/` (regola 4)
- Nessun artefatto del runtime di Claude Design in `dist/`: `x-dc`, `sc-for`,
  `sc-if`, `x-import`, `image-slot`, `DCLogic`, `support.js` (regola 8)
- Nessun `color-mix(` né `oklch(` nei token e nel CSS pubblicato (regola 3)
- Ogni colore base che ha una terna `--*-rgb` è coerente con essa: si legge
  `colors.css`, si converte l'esadecimale, si confronta (regola 3, seconda
  metà — è la parte che nessuno si accorge di aver rotto). Il colore si
  risolve **dentro il blocco** in cui sta la terna, perché lo stesso nome è
  legittimamente ridichiarato più volte — da `[data-theme="paper"]` oggi, da un
  `--accent` per ciclo alla PR 4
- Nessuna doppia dichiarazione e nessun `color-mix()` nei blocchi `<style>` dei
  componenti `.astro`. Per la regola 4 il sorgente è **l'unico** strato
  possibile: in `dist/` il minificatore ha già collassato le due righe e non
  resta niente da osservare
- `Archivo Black` è dichiarato come intervallo `font-weight: 400 900` e non
  come peso unico, nel sorgente e nel CSS pubblicato (regola 6)
- Nessuna dipendenza da Tailwind in `package.json` (regola 2)
- Il lockfile concorda con `package.json` su cosa è di sviluppo — controllo
  offline, senza rete e senza git
- In CI, il lockfile rigenerato non differisce da quello committato

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

La parte più grossa è la **migrazione all'inglese del codice esistente**: la
regola sulla lingua è cambiata nella PR 1, quando il progetto era già
cominciato, e finché non si chiude il codice già scritto contraddice il
`CLAUDE.md` che lo governa. Va fatta qui, prima che i token e i campi vengano
usati da tutto il resto.

### Decisioni prese scrivendo la PR

- **I nomi delle quattro collection restano in italiano** — `eventi`, `cicli`,
  `sedi`, `relatori`, cartelle e chiavi: sono l'unico pezzo di codice che si
  trova davanti chi redige i contenuti. I campi dentro quei file no, perché
  nessuno li incontra: nel CMS ogni campo porta la sua etichetta italiana. È
  un'eccezione dichiarata alla regola sulla lingua, scritta anche nel
  `CLAUDE.md` perché fra sei mesi non sembri una svista da correggere
- **I valori di `format` restano italiani** (`incontro`, `proiezione`,
  `presentazione`): arrivano al lettore così come sono, e tradurli imporrebbe
  una tabella di conversione in ogni componente che li mostra
- **`interventi` diventa `materials`**, non `recordings`: il campo tiene
  registrazioni *e* materiali collegati, e domani può essere un articolo

### Obiettivi

- [x] I commenti di `src/`, `scripts/` e `astro.config.mjs` sono in inglese, e
      con essi le variabili di `sync-fonts.mjs`. Cadono così gli accenti
      mancanti — *perche*, *gia*, *cosi* — che erano l'obiettivo originario di
      questo punto
- [x] I token CSS sono in inglese: `--h-scena` → `--scene-height`, `--accento`
      → `--accent`, `--sp-*` → `--space-*`, i colori di base, i `--veil-*`, e
      i selettori `[data-cycle]` e `[data-theme="paper"]`. Il ripiego
      `@supports` si è spostato insieme al token, e `checkSceneHeightFallback`
      ha preso il nome nuovo come valore predefinito — era parametrizzata
      apposta
- [x] I campi dello schema in `src/content.config.ts` sono in inglese, con le
      etichette del CMS che resteranno in italiano. I file in `src/content/`
      si sono adeguati
- [x] `README.md` alla radice non è più il template «Astro Starter Kit» e
      rimanda a `docs/`
- [x] La favicon viene dal marchio e non da Astro, in `.svg` e `.ico`. Il
      marchio esteso a 16px è illeggibile e la variante breve non esiste
      (regola 7): la riduzione è la tessera blu con la barra arancio e
      l'iniziale. Il `.ico` lo rigenera `npm run build`, non una mano che se ne
      ricorda
- [x] Esiste `src/content/relatori/piergiorgio-rosso.md` e la serata 81 non
      elenca più due volte la stessa persona — ma sovrascrive il ruolo di uno
      dei due, che è l'unico modo di tenere esercitato quel ramo
- [x] La serata 81 non ha più un `occhiello` che ripete il nome del ciclo
- [x] `npm run build` continua a passare

### Test automatici

- Nessuna proprietà personalizzata CSS, e nessun attributo `data-*`, con un
  nome italiano — nel sorgente e in `dist/`. Il confronto è per segmento fra
  trattini, non per sottostringa: un futuro `--shadow-blur` non contiene *blu*.
  Due guardie, non una: il selettore `[data-cycle="3"]` è CSS, l'attributo
  `data-cycle={n}` è markup, e la rinomina può fermarsi a metà
- Le regole 3 e 4 valgono anche per gli attributi `style` in linea, non solo
  per i blocchi `<style>`
- Il frontmatter di ogni file di contenuto si legge: uno che non si legge fa
  fallire un test che lo nomina, non l'intero file di test mentre si raccoglie
- Almeno un evento sovrascrive il ruolo di un relatore
- **Ogni `var(--x)` trova la sua dichiarazione**, in `dist/` e nel sorgente
  concatenato. Comprese le letture scritte negli attributi `style` in linea,
  che non stanno in nessun foglio di stile
- Nessun evento elenca due volte la stessa persona fra i relatori
- L'occhiello di un evento non contiene il nome del ciclo a cui appartiene
- Le guardie della PR 1 continuano a passare **dopo** la rinomina dei token:
  è il vero collaudo della loro indipendenza dai nomi

> **Aggiunto in corsa.** La guardia sui `var()` non vedeva gli attributi
> `style` in linea: rompendo un token di proposito nella pagina provvisoria,
> passava. Un `var()` scritto in un attributo non sta in nessun foglio di
> stile, né nel sorgente né in `dist/`. Ora `readPublishedCss()` legge anche
> quelli, e con essa tutte le guardie sullo stile. È la forma che userà lo
> scroller della PR 7 per l'accento di ogni scena.

> **Trovato rileggendo.** Quell'allargamento agli attributi in linea era
> arrivato a metà: `readPublishedCss()` li leggeva, ma nel sorgente le regole 3
> e 4 continuavano a guardare i soli blocchi `<style>` — e un `color-mix()`
> scritto in un attributo, che è la forma dell'export di Claude Design, non lo
> vedeva nessuno strato. Insieme sono venuti fuori altri tre buchi dello stesso
> tipo, tutti «la suite è verde e non sta guardando»: il `data-*` italiano nel
> markup, gli id delle entry ricavati col nome del file invece che come li
> ricava Astro — con la guardia sull'occhiello che smetteva di controllare in
> silenzio — e un `yaml.parse` senza rete che, capitando mentre vitest
> raccoglie i test, portava giù `sources.test.ts` intero senza dire quale file
> di contenuto lo avesse rotto.

### Test manuali

- La favicon si legge nella linguetta del browser, su tema chiaro e su tema
  scuro
- Il `README.md` si legge bene nell'interfaccia di GitHub

---

## PR 3 — Utilità di dominio

**Branch:** `lib-eventi` · **Dipende da:** 1, 2

`src/lib/events.ts`: il cuore logico del sito, puro e testabile, che tutte le
pagine useranno. Nasce qui e non dentro le pagine che lo consumeranno perché
dentro un componente `.astro` non si può passare un "adesso" finto, e senza un
adesso finto il confine fra passato e futuro non si prova: si aspetta.

Il vincolo che decide la forma è che **Cloudflare builda in UTC e le serate si
svolgono a Torino**. Una formattazione senza fuso funziona sulla macchina di
chi la scrive e sbaglia in produzione di due ore d'estate e di una d'inverno,
senza un errore da nessuna parte: è lo stesso guasto muto del ripiego
collassato e del `var()` senza dichiarazione.

### Decisioni prese scrivendo la PR

Le otto per esteso stanno in [decisioni.md](decisioni.md), sotto *Logica di
dominio*. In breve:

- **La verità cronologica è `number`**, non `date`: il numero è l'identità
  della serata. Un controllo alla build ferma tutto se i due ordini divergono
  o se due serate hanno lo stesso numero
- **La nota di una serata passata è sempre *Puntata registrata in sala***,
  anche senza materiali: a mancare senza link è il bottone, non la frase
- **Una serata annullata ha come nota *Serata annullata***, e lo scroller si
  apre sulla prima serata non ancora passata **e non annullata**
- **Le date portano l'anno**, che il design non aveva: su ottantuno serate
  *18 giugno* non identifica niente
- **Il dominio è in due file e il puro non importa niente**, `now` compreso: è
  ciò che permette di eseguirlo con `node` sotto due fusi diversi
- **Due serate d'esempio in più** — la 78, passata, con presenze e materiali, e
  la 82 — perché con la sola serata 81 metà del dominio non si vedrebbe girare
  su contenuti veri e il controllo d'ordine sarebbe vacuo

### Obiettivi

- [x] Ordinamento degli eventi per `number`, che è l'ordine del sito
- [x] Passato e futuro calcolati **in `Europe/Rome`**, per confronto fra date
      civili e non per aritmetica sugli offset: una serata diventa già svolta
      alla mezzanotte del giorno successivo, non all'ora di inizio
- [x] Formattazione italiana delle date: `24 set 26` per la Timeline,
      `gio 24 set 26, ore 21` per la scena — minuti solo quando ci sono
- [x] Risoluzione dei riferimenti a ciclo, sede e relatori, con il ruolo
      dell'evento che sovrascrive quello della persona. Un riferimento che non
      risolve ferma la build invece di viaggiare come `undefined`
- [x] Nota predefinita calcolata — *Ingresso libero, posti limitati* /
      *Puntata registrata in sala* / *Serata annullata* — sovrascrivibile dal
      campo `note`
- [x] Indice della prossima serata che si svolgerà, su cui si aprirà lo
      scroller
- [x] Un controllo alla build fallisce se l'ordine per `number` e l'ordine per
      `date` divergono, e nomina le due serate
- [x] `src/lib/events.ts` non ha import e non legge l'orologio
- [x] La pagina provvisoria mostra le stringhe calcolate: è ciò che dà allo
      strato `build` qualcosa su cui asserire

### Test automatici

- Una serata alle 21 di giovedì è ancora *in programma* alle 23:59 di giovedì
- La stessa serata è *già svolta* alle 00:00 di venerdì, ora italiana — cioè
  alle 22:00Z d'estate e alle 23:00Z d'inverno, che è il caso che la CI vive
- Il passaggio all'ora legale e a quella solare non sposta il confine: quattro
  asserzioni a cavallo delle due notti del 2026
- La build gira con `TZ=UTC`, come Cloudflare, e le stringhe italiane si
  leggono in `dist/`; due processi figli girano lo stesso modulo sotto `TZ=UTC`
  e `TZ=Europe/Rome` e danno lo stesso risultato — che è anche quello atteso,
  perché l'uguaglianza da sola passerebbe su due risposte sbagliate uguali
- **Guardia**: nessun `Intl.DateTimeFormat` e nessun `toLocale…` senza
  `timeZone` in `src/`; nessuna lettura dell'orologio in `src/lib/events.ts`.
  Entrambe con i loro casi negativi (regola 11)
- **Guardia**: in `dist/` non compare nessuna data scritta dalla macchina —
  `Thu Sep 24 2026`, `Thu, 24 Sep 2026`, `GMT` — che è la sola via per cui una
  `Date` supera le guardie sul codice: `{scene.date}` è un `toString()` come
  tutti gli altri
- **Guardia**: ogni `date` nel frontmatter porta il suo scostamento dal fuso,
  perché senza lo decide la macchina che builda
- Lo stato di ogni serata si legge da `data-state` e non dalle parole italiane,
  e la coppia stato-nota copre anche l'annullamento
- Le attese dello strato `build` si ricavano dai contenuti: aggiungere una
  serata, aprire una seconda sede o annullarne una non fa diventare rossa la
  suite
- Il ruolo dichiarato sull'evento vince su quello della persona; se manca, vale
  quello della persona
- Una serata annullata resta nell'elenco, conserva il suo numero e prende la
  sua nota; lo scroller la salta
- Ordine per `number` e ordine per `date` coincidono, sui contenuti veri e su
  una coppia invertita scritta a mano
- Ogni data del frontmatter si legge: una data illeggibile farebbe passare in
  silenzio il controllo d'ordine, perché ogni confronto con una *Invalid Date*
  è falso

> **Trovato in revisione.** Dieci difetti, e la metà erano guardie che non
> guardavano — la forma di guasto che questo repository si è dato l'impianto
> per intercettare, ripetuta dentro l'impianto stesso. Un apostrofo negli
> argomenti di un formattatore (`l'ora`) sfasava il conteggio delle virgolette,
> e il controllo finiva per leggere il `timeZone` di *un'altra* chiamata più
> in basso: nessuna violazione, mai. Il fuso veniva controllato per chiave e
> non per valore, quindi `timeZone: 'UTC'` passava — ed `'UTC'` è già scritto
> mezza dozzina di volte qui dentro, pronto da copiare. I metodi locali di
> `Date` — `getHours`, `getDay` — non li vedeva nessuno strato: un componente
> che ne usasse uno pubblicherebbe una serata di giovedì come mercoledì con la
> suite verde. La guardia sull'orologio era puntata su un percorso scritto a
> mano, così il secondo modulo puro sarebbe nato scoperto. E le righe di
> continuazione di un commento `/* … */` venivano lette come codice, cioè una
> guardia che diventa rossa sulla prosa — e quella la si spegne.
>
> Gli altri cinque: `nextEventIndex` contraddiceva il proprio contratto quando
> l'ultima serata è annullata, `findNumberDateConflicts` moriva con un
> `RangeError` proprio sulla data illeggibile che doveva raccontare — e prima
> di morire accusava del disordine anche il numero doppio, con una frase falsa
> in faccia («#81 viene prima di #81 ma si svolge dopo») — le asserzioni dello
> strato `build` sarebbero diventate rosse da sole il 9 ottobre 2026, quando la
> serata 82 passa, e si appoggiavano al `#78 · ` della pagina provvisoria
> invece che a un `data-number` che lo scroller porterà comunque.

> **Trovato nella seconda revisione.** Altri dieci, e i due temi sono gli
> stessi di prima visti da un altro lato. Le guardie sul fuso fallivano aperte
> in due modi nuovi: un `timeZone` scritto dentro un commento veniva letto come
> se fosse codice — bastava commentarlo mentre si debugga — e una costante di
> fuso importata da un altro file passava senza controllo, che è esattamente il
> refactoring che la PR 8 inviterà a fare. `REUSE_DIST=1` saltava l'unico posto
> in cui `TZ=UTC` era dichiarato, così un `dist/` costruito a Torino passava per
> il motivo che quelle asserzioni escludono: il fuso è passato nello script
> `build`. E lo strato `build` era saldato alle tre serate d'esempio e alla
> prosa italiana — annullare una serata, aggiungere la 083, aprire una seconda
> sede o scrivere una descrizione che contiene *in programma* facevano diventare
> rossa la suite senza che niente fosse rotto, con l'errore puntato su un test
> invece che sul contenuto.
>
> Gli altri: `loadProgramme` rileggeva l'orologio a ogni chiamata, e la garanzia
> che il suo stesso commento dichiarava valeva solo dentro una pagina; nessuna
> guardia vedeva una `Date` data in pasto a qualcosa che si aspetta una stringa,
> che è la stessa differenza di due ore per una via che nessun controllo sulla
> forma della chiamata può riconoscere; la regola 11 elencava quattro metodi
> vietati e la guardia ne vietava nove, cioè la CI poteva citare una regola che
> non nomina il metodo su cui è scattata — e la reazione naturale a quello è
> allargare l'elenco della guardia; e la pagina provvisoria era stata estesa
> contro quello che il `CLAUDE.md` prescrive, senza dirlo. L'estensione è
> deliberata e ora è scritta nella regola: quella pagina è l'unica prova
> pubblicata che lo strato `build` ha, e porta `data-number` e `data-state` per
> questo.

> **Trovata nella terza revisione.** Dieci, e la prima vale da sola tutte le
> altre: `'**` seguito da `/*` — il glob con cui si carica una collection —
> conteneva un apri-commento, così il controllo «questo indice sta dentro un
> commento?» dichiarava commentato tutto quello che veniva dopo. In
> `content.config.ts` quel glob sta alla riga 31: da lì in giù **le tre guardie
> sul codice non guardavano niente**, ed era la terza revisione di fila a
> trovare una guardia che non guarda. Le stringhe si cancellano ora prima di
> cercare i commenti.
>
> Due difetti erano nel dominio: il controllo d'ordine confrontava istanti e non
> giorni civili, quindi due serate lo stesso giorno facevano fallire la build con
> una frase che nominava la stessa data da tutte e due le parti; e un numero
> doppio lasciava dentro il gemello sbagliato, a seconda dell'ordine dei file,
> facendo accusare del disordine la serata giusta. Due erano nello strato
> `build`: confrontava il frontmatter grezzo con il markup, dove Astro fa
> l'escape degli apostrofi — un ruolo come *coordinatrice dell'archivio* bastava
> a far diventare rossa la suite — e si appoggiava ancora a due stringhe italiane
> della pagina provvisoria che il `CLAUDE.md` prometteva di non dover
> conservare.
>
> Gli altri: `toUTCString()` passava tutte e quattro le guardie, la guardia
> sull'orologio guardava solo `src/lib`, lo stato di una serata era un ternario
> nel markup senza test — con la sola serata annullata che nessun contenuto
> d'esempio ha — e `TZ=UTC` alla build cambia come `z.coerce.date()` legge una
> data senza scostamento, che è l'unica regola sul tempo che vive nei contenuti
> e ora ha la sua guardia. Uno solo è stato lasciato aperto per scelta: il
> prefisso `TZ=UTC` non funziona su Windows, che questo repository non supporta
> comunque.

### Test manuali

- Lettura a campione delle stringhe di data generate: maiuscole, preposizioni,
  l'anno al posto giusto in entrambe le forme
- `npm run dev`, spostare a ieri la data di una serata d'esempio e vedere nota,
  ordine e scena di apertura cambiare

---

## PR 4 — Accento dai cicli della collection

**Branch:** `accento-dai-cicli` · **Dipende da:** 3

Il ponte che mancava fra `src/content/cicli/` e `--accent`. La collection aveva
il campo `color` da quando esiste lo schema e non lo leggeva nessuno;
`colors.css` aveva cinque regole `[data-cycle="N"]` che puntavano ai cinque
token del design. Le due metà non si toccavano: cambiare il colore di un ciclo
nel suo file non si vedeva da nessuna parte, e non falliva niente. Serve prima
dello scroller, che cambia accento a ogni serata.

### Decisioni prese scrivendo la PR

Le sette per esteso stanno in [decisioni.md](decisioni.md), sotto *Accento dai
cicli*. In breve:

- **La collection è l'unica sorgente delle regole `[data-cycle]`**: le cinque
  scritte a mano escono da `colors.css`, perché due dichiarazioni della stessa
  proprietà alla stessa specificità le decide l'ordine dei fogli — giusto oggi,
  sbagliato in silenzio il giorno che quell'ordine cambia
- **I cinque colori restano dichiarati e non più letti**, come palette di
  riferimento per chi ne sceglie uno nuovo; l'unico ancora letto è `--cycle-1`,
  l'accento fuori da un ciclo
- **Il numero di un ciclo è unico e la build lo pretende**: è il nome del ciclo
  nel CSS, e due gemelli si sovrascriverebbero l'accento a vicenda
- **Il CSS lo emette un componente**, `CycleAccents.astro`, non un endpoint né
  un file generato: nessuna richiesta in più, nessun artefatto da tenere
  allineato, e dalla PR 5 sta nel layout
- **La terna dell'accento diventa letterale**, e questo fa cominciare a
  controllare `checkRgbTriples`, che su un `var(--cycle-N-rgb)` passava senza
  guardare niente
- **Un sesto ciclo e la serata 83**, perché i due casi che contano — un colore
  diverso dal predefinito, un ciclo oltre il quinto — non si vedevano girare su
  contenuti veri

### Obiettivi

- [x] Le regole `[data-cycle="N"] { --accent; --accent-rgb }` sono emesse
      alla build da ogni ciclo presente nella collection
- [x] I cinque colori di `colors.css` restano come valori predefiniti
      dichiarati, non come unica fonte — e le cinque regole statiche escono,
      perché due sorgenti si contraddicono in silenzio
- [x] Nessun `color-mix()` introdotto per ricavare le trasparenze dell'accento
- [x] Due cicli con lo stesso numero fermano la build, nominando entrambi
- [x] `src/lib/cycles.ts` non ha import e non legge l'orologio, come `events.ts`
- [x] `CycleAccents.astro` esiste e la pagina provvisoria lo include: il bordo
      di ogni scena prende il colore del suo ciclo — l'attributo `data-cycle`
      c'era già, da qui in poi fa qualcosa
- [x] Il ciclo 6 e la serata 83 stanno nei contenuti d'esempio

### Test automatici

- Un ciclo il cui colore differisce dal predefinito arriva col colore giusto
  nel CSS di `dist/`, e l'attesa si ricava dalla collection: un esadecimale
  scritto nel test diventerebbe rosso il giorno che un redattore ritara un
  ciclo, indicando un test invece del contenuto
- Un ciclo con numero oltre il quinto ottiene il suo accento
- La conversione esadecimale → terna `rgb` è corretta, compresi i valori con
  componenti a zero — dove un `|| default` di troppo trasforma un turchese in
  altro — e le due scritture delle cifre
- **Guardia**: nessuna regola `[data-cycle]` scritta a mano nei fogli di
  `src/styles/` né nei `<style>` dei componenti. Il caso negativo è la riga che
  questa PR ha tolto
- **Guardia**: ogni `data-cycle` pubblicato in una pagina di `dist/` trova la
  sua regola nel CSS che quella pagina riceve. È la promessa che le PR 5, 7 e 9
  devono mantenere portandosi dietro il componente, e provata rimuovendolo per
  davvero: sei asserzioni diventano rosse, e la prima dice quale componente
  manca
- Il generatore rifiuta quello che non riconosce invece di scriverlo: `set:html`
  non fa escape, quindi un colore che non è un esadecimale a sei cifre ferma la
  build (regola 12)
- Ogni ciclo della collection ha in `dist/` una regola con la terna coerente col
  suo esadecimale, e l'accento resta un esadecimale letterale — tornare a un
  puntatore rimetterebbe a dormire la guardia in silenzio
- Le guardie della PR 1 continuano a passare

> **Trovato rileggendo.** La seconda guardia contava i selettori invece degli
> accenti: una regola che nominava il ciclo senza dichiarare `--accent` — un
> bordo, un `display` — bastava a soddisfarla, cioè rispondeva *sì* a una
> domanda diversa da quella che il suo messaggio d'errore pone. Ora guarda le
> regole che l'accento lo dichiarano davvero, dentro le media query comprese, e
> ha i due casi in più che lo provano.

> **Lacuna della PR 3, chiusa qui.** Contando le guardie per rispondere a
> «funzionano tutte?» ne è saltata fuori una senza caso negativo:
> `checkDateHasOffset`, usata in un posto solo e sui contenuti veri, dove ci si
> aspetta che non trovi niente — cioè mai vista scattare, che per il
> `CLAUDE.md` non si distingue da una che non sta guardando. Guardava: scatta su
> una data senza scostamento, su una data nuda e sul campo mancante, e tace su
> `+01:00` e su `Z`. Quello che mancava è ciò che la tiene a guardare, e ora sono
> cinque asserzioni — compreso il ramo che si rifiuta di rispondere su una data
> arrivata già convertita in `Date`, che è l'unico modo in cui questa guardia
> potrebbe passare su tutti i file per cui esiste.
>
> Il conto è stato poi rifatto **accecando ogni guardia a turno** — sostituendone
> il corpo con «nessuna violazione» e guardando se la suite se ne accorge —
> invece che cercandone il nome nei test, che le contava per come sono scritte e
> non per quello che tengono: **22 su 22**, ognuna sostenuta da un numero di
> asserzioni che va da due a undici.
>
> **Il primo giro in CI dello strumento nuovo è stato rosso, per il difetto che
> lo strumento caccia.** Rispondeva «0 su 22, la suite non ha risposto» mentre la
> suite girava e falliva esattamente come doveva. Il riepilogo di vitest è
> `Tests  9 failed`, e su una macchina di build fra la parola e il numero ci sono
> i codici di colore; in locale non ci sono. Lo stesso comando rispondeva una cosa
> sulla scrivania e un'altra in CI, che è la forma del fuso orario vista da un
> altro lato — e il primo tentativo di riprodurlo in locale con le variabili
> d'ambiente della CI *non* l'ha riprodotto, il che l'ha reso più istruttivo, non
> meno. Adesso la lettura toglie i colori e chiede di non averli, è una funzione
> esportata con i suoi test — compreso il riepilogo colorato che ha causato il
> guasto — e distingue «nessun conteggio» da «zero falliti», che su una guardia
> accecata sono risposte opposte. E quando la suite non arriva a un conteggio, lo
> strumento stampa la coda del suo output: taceva esattamente dove doveva
> parlare, che è la cosa che rimprovera alle guardie.
>
> Quel conto è diventato un comando, `npm run test:mutate`, e uno step della CI:
> farlo a mano una volta rispondeva alla domanda di oggi e a nessuna di domani.
> Non sta in `npm test` perché costa la suite intera una volta per guardia. Ha
> il suo test, perché ha esattamente il modo di fallire che caccia — trovando
> meno guardie di quante ce ne sono direbbe «18 su 18», che si legge come una
> risposta — ed è stato visto scattare mettendogli davanti una guardia che
> nessun test copre: la nomina ed esce con 1.

> **Trovato in revisione.** Quindici difetti, e il grosso stava nello strumento
> nuovo: quattro modi diversi in cui `test:mutate` poteva stampare «22 su 22»
> senza aver accecato una guardia. Lo scanner attribuiva a una funzione col corpo
> su una riga sola l'offset della funzione *dopo* — così quella veniva accecata
> due volte e questa, mai toccata, risultava coperta; non c'era nessun controllo
> che la suite fosse verde *prima* di cominciare, e con un `dist/` stantio ogni
> accecamento sembra notato; e il «secondo conteggio indipendente» condivideva
> con lo scanner sia la regola per riconoscere una dichiarazione sia l'elenco dei
> file, cioè concordava proprio su ciò di cui doveva litigare. In più il
> ripristino riscriveva *tutti* i file da una copia di minuti prima, cancellando
> in silenzio le modifiche fatte nel frattempo, e gli handler dei segnali non
> potevano girare perché il ciclo era sincrono — avendo però già tolto a Node la
> terminazione predefinita, cioè Ctrl-C non fermava più niente.
>
> Sul dominio, tre cose. La guardia sulle regole scritte a mano segnalava
> qualunque `[data-cycle…]` — compreso `[data-cycle-label]` e compreso lo
> `scroll-snap-align` che la PR 7 scriverà legittimamente — mentre la gemella
> nello stesso file ragiona esplicitamente al contrario; leggeva inoltre i soli
> fogli di `src/styles`, quindi una regola d'accento in `public/` passava
> indisturbata. La guardia sulle pagine pubblicate non annullava i commenti HTML,
> e una scena lasciata in bozza avrebbe fatto fallire la CI accusando un
> componente presente. E il valore predefinito dell'accento, spostato in `:root`,
> pareggia con le regole emesse: `:where(:root)` toglie il pareggio.
>
> Due riguardano ciò che questa PR ha smesso di garantire senza dirlo. Il colore
> di un ciclo non ha più i cinque token a limitarlo, e fra il CMS e la pagina
> restava la sola sintassi esadecimale: ora una guardia pretende 3:1 sul fondo.
> E `checkRgbTriples`, che la PR dichiarava di aver *acceso* sull'accento, ha
> smesso in silenzio di segnalare una terna orfana — con `--accent` che ora vale
> più esadecimali diversi, il suo ramo «non c'è un'unica risposta» è diventato il
> caso normale, ed è esattamente la forma che lo scroller della PR 7 scriverà.

### Test manuali

- Cambiare il colore di un ciclo nel suo file e vedere l'accento cambiare in
  `npm run dev` — fatto anche a build ferma, con il colore del ciclo 6 spostato
  e ritrovato in `dist/` senza che la suite se ne lamentasse
- Guardare i sei colori sul fondo blu: nessuno prevale, nessuno si confonde col
  fondo

---

## PR 5 — Layout di base e forme di ritaglio

**Branch:** `layout-base` · **Dipende da:** 4

### Obiettivi

- [ ] `src/layouts/Base.astro`: `lang="it"`, meta, Open Graph e Twitter,
      `global.css`, slot
- [ ] Link «salta al programma», visibile quando riceve la messa a fuoco
- [ ] `src/components/ClipShapes.astro` con i `<clipPath>` del design, da
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

`Button` · `Label` · `Card` · `Brand` · `SignatureBand` · `EpisodeBadge` ·
`GuestRow` · `EventCard`, portati da React a `.astro`. Nell'export del design
si chiamano `Bottone`, `Etichetta`, `Scheda`, `Marchio`, `FasciaFirma`,
`BadgePuntata`, `RigaOspite`, `SchedaEvento`: i nomi qui sono quelli del
`CLAUDE.md`, perché un componente è codice.

### Obiettivi

- [ ] Gli otto componenti esistono in `src/components/`, nessuna isola React
- [ ] `Button` replica l'effetto premuto con `:active`, senza JavaScript
- [ ] `Brand` **non ha la prop `forma`**: la variante breve non esiste, così
      non può essere usata per sbaglio. Nell'export era comunque muta —
      restituiva lo stesso testo dell'estesa
- [ ] Gli stili stanno nei `<style>` dei componenti e usano i token, non valori
      grezzi
- [ ] Una pagina di rassegna interna mostra tutti i componenti e le loro
      varianti

### Test automatici

- Dovunque compaia il marchio compare la scritta «in Periferia»
- Le varianti di `Button` e `Label` rendono i token attesi
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

- [ ] `/` è lo scroller a scroll-snap, con una sezione alta `--scene-height` per
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

- [ ] Rotta `/[number]`, una pagina per serata, con il titolo in `<h1>`
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
