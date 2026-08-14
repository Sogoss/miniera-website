# Piano di lavoro

Il sito si costruisce per passi numerati, uno per PR. Questo documento è
l'elenco dei passi, in ordine, con quello che ciascuno deve dimostrare prima di
poter essere chiuso.

Aggiornato al 13 agosto 2026.

## Come si lavora

1. **Il piano viene scritto per primo.** Prima del branch, prima della PR.
   Viene approvato, e il testo approvato diventa il corpo della PR.
2. **Il numero di un passo è il numero della sua PR su GitHub.** Sono lo stesso
   elenco visto da due parti, e tenerli separati vuol dire che «la PR 12» non
   identifica niente senza chiedere quale dei due si intende. La conseguenza da
   ricordare è che **ogni** PR prende un numero, anche quella che tocca solo la
   documentazione: quando ne serve una fuori programma, entra nell'elenco con la
   sua riga invece di lasciare un buco.
3. **Un branch per PR**, che parte da `main` aggiornato. **Su `main` non si
   spinge mai direttamente**: ogni modifica passa da una PR, compresa quella di
   una riga e compresa la documentazione.
4. **Merge sempre in squash and merge.** Il repository è configurato perché sia
   l'unico metodo possibile: merge commit e rebase sono disabilitati, il branch
   viene cancellato dopo il merge.
5. **Ogni PR dichiara tre cose**: nome del branch, obiettivi da verificare prima
   della chiusura, test richiesti — automatici e manuali.
6. **Una PR si chiude solo con tutti i test verdi.** Un test rosso non si
   aggira, non si disattiva e non si rimanda alla PR successiva: o si sistema
   il codice, o si sistema il test perché era sbagliato — dicendo perché.
7. **Le decisioni si registrano nella PR che le prende**, in
   [decisioni.md](decisioni.md), e la voce corrispondente esce da
   [questioni-aperte.md](questioni-aperte.md).
8. Quando una PR viene chiusa, la sua riga qui sotto passa a *fatta*.

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
| 5 | Layout di base e forme di ritaglio | `layout-base` | fatta |
| 6 | Gli otto componenti del design system | `design-system-astro` | fatta |
| 7 | Lo scroller del programma | `scroller-programma` | fatta |
| 8 | Timeline e navigazione da tastiera | `timeline` | fatta |
| 9 | Le pagine delle serate | `pagine-serata` | fatta |
| 10 | Il piano: la Timeline che raggiunge l'archivio | `piano-timeline-archivio` | fatta |
| 11 | La Timeline raggiunge l'archivio | `timeline-archivio` | fatta |
| 12 | La prenotazione dentro il modale | `modale-prenotazione` | fatta |
| 13 | Chi siamo, contatti, rassegna disabilitata | `pagine-istituzionali` | fatta |
| 14 | Sveltia CMS | `cms-sveltia` | fatta |
| 15 | Pubblicazione | `pubblicazione` | da fare |
| 16 | Proporzioni su schermo piccolo | `proporzioni-mobile` | da fare |

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

Fino a qui l'unica pagina si scriveva da sé `<html>`, `<head>`, la favicon e il
viewport. Da qui non lo fa più nessuno: il layout possiede il documento, le
pagine il contenuto.

### Decisioni prese scrivendo la PR

Per esteso in [decisioni.md](decisioni.md), sotto *Layout e forme di ritaglio*.
In breve:

- **Nel layout ci sta ciò che, dimenticato, non fa fallire niente**: la lingua,
  i meta, e i due componenti che devono viaggiare con ogni pagina —
  `CycleAccents` e `ClipShapes`. Un accento rimasto arancio, una foto non
  ritagliata e una pagina senza lingua sono tre guasti muti
- **I nomi delle forme vengono da Material 3, la geometria dal design**: gli
  `id` sono codice, e la libreria di Google ha già un nome per quattro di queste
  geometrie. La tabella sta in [design.md](design.md)
- **Ma un nome si prende solo se corrisponde**: l'obliqua si chiama
  `clip-skewed`, perché lo `slanted` di Material è un quadrato arrotondato e
  questa è un quadrilatero a spigoli netti — deciso guardando le forme a
  schermo, nel controllo manuale. E la pill, che qualcuno cercherà fra le forme,
  non è un ritaglio ma `--radius-pill`: il design la usa così sette volte, e
  sotto `objectBoundingBox` un raggio si deforma col rapporto d'aspetto
- **Le forme distinte sono cinque, non sei**: l'ottofoglio è definito due volte
  nell'export perché quelli sono due design
- **Le geometrie esatte di Material sono rimandate alla PR 6**, la prima che
  ritaglia qualcosa davvero: Google non le pubblica come path e la differenza si
  giudica davanti a un ritratto, non al buio
- **`og:url` e `og:image` aspettano il dominio**, e la guardia li pretende
  quando `site` compare in `astro.config.mjs` — leggendolo, non ricordandolo

### Obiettivi

- [x] `src/layouts/Base.astro`: `lang="it"`, charset, viewport, favicon, meta,
      Open Graph e Twitter, `global.css`, i due componenti, slot
- [x] Link «Salta al programma», visibile quando riceve la messa a fuoco, con il
      `<main>` che prende `tabindex="-1"` perché il salto sposti il fuoco e non
      solo lo scorrimento
- [x] `src/components/ClipShapes.astro` con le cinque forme, incluso dal layout:
      le definizioni valgono solo dentro la pagina che le contiene
- [x] La pagina provvisoria continua a funzionare, e non possiede più niente del
      documento
- [x] Tabella delle forme in `design.md`, scelta rimandata in
      `questioni-aperte.md`

### Test automatici

- Ogni pagina prodotta dichiara `lang="it"`, il charset, il viewport e ha un
  solo `<h1>`
- **Guardia**: ogni `clip-path: url(#…)` di una pagina trova il suo `id` nella
  stessa pagina. Oggi nessuna pagina ritaglia — le forme le userà `GuestRow`
  dalla PR 6 — e il test lo dice: a tenerla onesta ci sono i casi negativi
- **Guardia**: due `<clipPath>` con lo stesso `id`, che è il guasto muto
  verificabile oggi — il secondo non sostituisce il primo, viene ignorato
- Ogni pagina porta tutte le forme che il componente dichiara, e nessun `id`
  italiano dell'export arriva in `dist/`
- I meta Open Graph di base ci sono, e **`og:url` e `og:image` sono pretesi
  appena `site` è impostato**: il test si accende da solo alla PR 15
- Il salta-a è il primo link del `<body>` e punta a un `id` che esiste — non a
  uno che gli somiglia: `#programma` non è soddisfatto da `id="programma-2"`,
  ed è il primo difetto che il caso negativo ha trovato nella guardia appena
  scritta
- Le guardie della PR 1 continuano a passare, e `npm run test:mutate` con loro

> **Trovato in revisione.** Quindici difetti, e quattordici stavano nelle tre
> guardie nuove: approssimazioni su stringhe che rispondevano *va bene* proprio
> al guasto descritto dal loro messaggio, o *è rotto* a markup corretto — che è
> la metà peggiore, perché una guardia che scatta sul lavoro giusto la si
> spegne. `data-id` soddisfaceva il bersaglio del salta-a; il viewport veniva
> cercato e mai letto, quindi `content="width=1024"` passava; `xml:lang` valeva
> come `lang`; gli `<h1>` dentro uno script venivano contati, e uno script in
> linea è ciò che la PR 7 porterà; un `<meta content="…" property="og:title">`
> risultava mancante per il solo ordine degli attributi; i commenti venivano
> annullati nel markup ma non nel CSS, mentre il commento della funzione
> dichiarava il contrario; e «il salta-a viene per primo» guardava i soli `<a>`,
> cioè era cieco alla navigazione del design, che è fatta di `<button>`.
>
> Tre erano scoperture più che errori: niente verificava che il bersaglio del
> salta-a fosse focusabile — `tabindex="-1"`, l'unica cosa che secondo
> `decisioni.md` lo fa funzionare, si poteva cancellare con la suite verde —
> niente leggeva il CSS pubblicato del link, che è dove la regola può sparire, e
> `declaredShapes` pretendeva `id` come primo attributo mentre la guardia
> gemella accettava qualunque ordine.
>
> Due guardavano al futuro e l'avrebbero rotto: `publishedPages()` consegnava
> alle guardie del documento anche le pagine copiate da `public/`, cioè la
> PR 14 non avrebbe potuto chiudere verde con la shell di Sveltia in
> `public/admin/`; e pretendere `og:image` all'arrivo del dominio avrebbe aperto
> la PR 15 su una suite rossa chiudibile solo inventando un'immagine che nessuno
> ha scelto. L'immagine è una questione aperta, non un test.

### Test manuali

- Il link «Salta al programma» si raggiunge col primo Tab, è visibile e porta al
  programma
- Le forme rendono come nell'anteprima del design aperta in locale, ritagliando
  a mano un'immagine di prova: in questa PR non le usa ancora nessuno

---

## PR 6 — Gli otto componenti del design system

**Branch:** `design-system-astro` · **Dipende da:** 5

`Button` · `Label` · `Card` · `Brand` · `SignatureBand` · `EpisodeBadge` ·
`GuestRow` · `EventCard`, portati da React a `.astro`. Nell'export del design
si chiamano `Bottone`, `Etichetta`, `Scheda`, `Marchio`, `FasciaFirma`,
`BadgePuntata`, `RigaOspite`, `SchedaEvento`: i nomi qui sono quelli del
`CLAUDE.md`, perché un componente è codice.

È anche la prima PR che **ritaglia qualcosa davvero**, e quindi quella che
chiude la questione aperta sulle geometrie delle forme.

Quattro degli otto — `Card`, `SignatureBand`, `EpisodeBadge`, `EventCard` — non
compaiono in nessuna delle due schermate dell'export: esistono nel design system
e non li usa nessuno. Si portano lo stesso, ed è la pagina di rassegna l'unico
posto in cui si vedono.

### Decisioni prese scrivendo la PR

Le tredici per esteso stanno in [decisioni.md](decisioni.md), sotto *Design
system* e *Forme di ritaglio, la geometria*. In breve:

- **Un componente rende l'elemento giusto**: `Button` è un `<button>`, e un
  `<a>` quando riceve `href`. Nell'export il bottone è sempre avvolto da chi lo
  rende cliccabile — `<a><button>…</button></a>` — che è markup non valido e due
  fermate di tabulazione per una cosa sola
- **L'effetto premuto è `:active`, e lo stato sparisce**
- **`Brand` non ha la prop di forma**, e la firma sta nel template invece che in
  un valore predefinito: un predefinito è qualcosa per cui si può passare altro
- **La banda porta la firma intera**, «MINIERA CULTURALE IN PERIFERIA»: quella
  dell'export è la variante breve vietata dalla regola 7 in un altro carattere
- **Le misure numeriche dell'export diventano custom property** con il default
  nel componente — `--brand-height`, `--band-size`, `--badge-size`,
  `--guest-size`
- **Il ritratto entra in `GuestRow`, come slot**: nell'export misura e forma
  stanno nel markup della scena, cioè fuori dal componente che le possiede
- **`EventCard` non ha un indirizzo predefinito**, e le date che entrano in un
  componente sono stringhe già formattate — mai una `Date`
- **Le varianti sono attributi `data-*`**, e le attese dei test sono nomi di
  token, mai colori
- **La rassegna è pubblicata a `/componenti`, con `noindex`**: lo strato `build`
  legge `dist/` e nient'altro
- **Le geometrie di Material si ricostruiscono qui**, con parametri nostri, e la
  documentazione dice che sono *ispirate* a Material e non le sue
- **Le forme a lobi si costruiscono con i cerchi**, non arrotondando un poligono
- **La Pill di Material entra fra le forme**, chiesta a lavoro in corso: è un
  quadrilatero arrotondato e inclinato, non il `--radius-pill` dei bottoni, e la
  decisione della PR 5 che escludeva «la pill» parlava dell'altra delle due

### Obiettivi

- [x] Gli otto componenti esistono in `src/components/`, nessuna isola React,
      nessuna direttiva `client:`
- [x] `Button` replica l'effetto premuto con `:active`, senza JavaScript, ed è
      un `<a>` quando riceve `href`
- [x] `Brand` **non ha la prop `forma`**: la variante breve non esiste, così
      non può essere usata per sbaglio. Nell'export era comunque muta —
      restituiva lo stesso testo dell'estesa
- [x] Gli stili stanno nei `<style>` dei componenti e usano i token, non valori
      grezzi
- [x] `GuestRow` ritaglia il ritratto con `clip-clover-8`, e il ritaglio arriva
      in `dist/`
- [x] `src/lib/shapes.ts` genera le forme ricostruite — quattro, più la Pill di
      Material aggiunta in corsa: puro, senza import e senza orologio, come
      `events.ts` e `cycles.ts`
- [x] `ClipShapes.astro` emette i path generati, e gli `id` di prima non
      cambiano
- [x] Una pagina di rassegna interna mostra tutti i componenti e le loro
      varianti, con un solo `<h1>` e `noindex`
- [x] La questione delle geometrie è chiusa e la documentazione aggiornata

### Test automatici

- Dovunque compaia il marchio compare la scritta «in Periferia» — **guardia**
  sul pubblicato, che legge il testo *dentro* l'elemento `data-brand` e non gli
  attributi: una firma messa in un `aria-label` sopra un marchio troncato è il
  difetto, non il rimedio
- **Guardia** sul sorgente: `Brand.astro` non offre nessuna prop di forma. È la
  metà che scatta prima che qualcosa venga pubblicato senza firma
- Le varianti di `Button` e i toni di `Label` rendono i token attesi, letti dal
  CSS che quella pagina riceve
- **Guardia**: nessun valore colore grezzo nei `.astro` — con
  `rgba(var(--x-rgb), 0.68)` che resta legittimo, perché è la forma che il
  `CLAUDE.md` prescrive e una guardia che scattasse lì verrebbe spenta
- **Guardia**: nessuna dipendenza da un framework UI, nessuna direttiva
  `client:`, e nessun runtime nel pubblicato — tre posti, perché la decisione si
  può perdere in tre modi diversi
- Il generatore delle forme provato sui numeri: path chiuso, coordinate dentro
  `[0, 1]`, un arco per lobo e uno per raccordo, la simmetria che il numero di
  lobi implica, e il lobo che tocca davvero il bordo — ricostruendo il cerchio
  dell'arco, perché il punto più esterno di una forma non è mai fra le
  coordinate scritte nel path
- **Guardia**: nessun `<clipPath>` senza geometria. Un ritaglio vuoto non viene
  ignorato, ritaglia *tutto*: pubblica un buco al posto della foto con l'`id`
  che risolve e ogni altra guardia verde
- `checkClipShapeReferences` risolve un riferimento vero: la guardia della PR 5
  esce dal ramo «nessuna pagina ritaglia», e un'asserzione pretende che almeno
  una pagina chieda una forma — altrimenti la soddisferebbe il silenzio
- Le guardie delle PR precedenti continuano a passare, e `npm run test:mutate`
  con loro: **36 su 36**

> **Trovato scrivendo.** Tre cose, tutte dalla stessa parte: un test che
> falliva su codice giusto. La guardia sui colori cancellava il `var()` per
> intero e con esso il suo ripiego, quindi `var(--accent, #f26419)` — la forma
> esatta che l'export scrive — passava senza essere guardata. La guardia sul
> marchio riconosceva una prop solo a inizio riga, e `type Props = { shape?:
> 'short' }` scritto su una riga sola le sfuggiva. E il generatore delle forme è
> stato scritto due volte: la prima come stella con gli angoli arrotondati, che
> è la costruzione ovvia e non può dare lobi tondi e rientranze profonde
> insieme. Se ne è accorto il rendering, non un test — motivo per cui il
> controllo manuale di questa PR non è un ripiego.
>
> Un ramo è stato tolto invece che provato: il generatore calcolava per ogni
> lobo se l'arco superasse il mezzo giro, e non può superarlo — il raccordo cade
> sempre più esterno del centro del lobo. Un ramo che nessun parametro raggiunge
> non si distingue da un ramo sbagliato, e ora quella proprietà è un test.

> **Trovato in revisione.** Quindici difetti, e la maggior parte sta nello
> strato di verifica: è la forma di guasto che questo repository si è dato
> l'impianto per intercettare, ripetuta dentro l'impianto.
>
> Quattro erano nel codice. Una collection `eventi` vuota faceva morire la build
> con un `TypeError` che indicava la rassegna invece del contenuto — ora è un
> messaggio che nomina la cartella. Il **3:1 dell'accento** era verificato solo
> contro il fondo della pagina, mentre `EventCard` e `Card raised` lo disegnano
> su `--surface-raised`, che è più chiaro: un colore tarato esattamente sulla
> soglia contro il blu scuro sta a 2.37:1 sul blu chiaro, e la fascia della
> scheda — l'unità principale del sito — sarebbe stata sotto soglia con la suite
> verde. Quattro componenti scrivevano il proprio `style` prima di `{...rest}`,
> quindi lo `style` di chi li usa arrivava nel markup come secondo attributo e il
> browser lo buttava: è esattamente l'idioma con cui la PR 7 darà a un componente
> l'accento della sua serata, e `astro check` restava verde perché la prop
> esisteva. E un link disabilitato portava `aria-disabled` su un `<a>` senza
> `href`, che non ha ruolo di link: l'attributo non qualificava niente e chi usa
> uno screen reader non sentiva né che è un link né che è spento.
>
> Le altre erano guardie che non guardavano. `declarationsFor` cercava su una
> copia del CSS senza virgolette e affettava l'originale, sfasata di una
> posizione per ogni virgoletta precedente — atterrava sulla regola giusta per
> fortuna. `brandElements` contava i tag di chiusura per trovare la fine di un
> marchio, quindi un `<img data-brand>` — un logo raster — faceva correre la
> scansione fino a fine documento e superava il controllo prendendo in prestito
> la firma della banda più in basso. `checkEmptyClipShapes` accettava le
> primitive per il solo nome del tag, cioè `<circle cx cy>` senza raggio, che è
> il modo dell'export di scrivere una forma con un attributo in meno. La guardia
> sui colori grezzi non leggeva mai il pubblicato, dove un colore scritto come
> espressione è l'unico posto in cui si vede. `createElement` come sottostringa
> avrebbe fatto fallire la CI su `document.createElement`, cioè su DOM puro.
> Niente pretendeva che una pagina portasse davvero un `data-brand`: bastava
> rinominare l'attributo e la metà pubblicata della regola 7 sarebbe passata su
> una lista vuota. E la regola 13, aggiunta in questa PR, non aveva guardia per
> il suo vincolo principale — una forma incollata da una libreria si pubblicava
> con tutto verde.
>
> Due riguardavano ciò che il codice dice di sé: la banda lasciava il testo
> libero senza che nessuna guardia potesse vederlo — ora porta `data-brand`, e
> chi vuole una fascia con un altro testo scrive un altro elemento — e un
> commento certificava che il quadrifoglio generato è quello dell'export con le
> cuspidi raccordate, mentre è ruotato di 45° e costruito in un altro modo. È la
> fedeltà non verificabile che la regola 13 vieta, scritta nel modulo a cui la
> regola punta.

### Test manuali

- Confronto a schermo con `design-export/sito-miniera.dc.html` aperto in
  locale, componente per componente
- L'effetto premuto del bottone funziona col mouse e col dito
- **Le forme ricostruite guardate accanto a quelle dell'export**, grandi e a
  56×56, che è la misura in cui il design le applica. Fatto rendendo le une e le
  altre nello stesso foglio: è così che si è visto che la prima costruzione dava
  una stella al posto di un quadrifoglio
- Il ritaglio davanti a un ritratto vero: nessun relatore d'esempio ha una foto,
  quindi si mette una foto in un file di `src/content/relatori/` e si guarda
  `/componenti` in `npm run dev`
- Tastiera: `Button` come link e come bottone, fuoco sempre visibile

---

## PR 7 — Lo scroller del programma

**Branch:** `scroller-programma` · **Dipende da:** 6

Sostituisce la pagina provvisoria. Solo le scene: la Timeline è la PR dopo.

### Decisioni prese scrivendo la PR

Per esteso in [decisioni.md](decisioni.md), sotto *Lo scroller*. In breve:

- **L'apertura sulla prima serata futura è uno script in linea**, ed è l'unica
  cosa qui che il CSS non può fare: un documento si apre in cima. Dieci righe,
  sincrone, prima della prima pittura — e senza JavaScript il programma si apre
  dalla serata più vecchia e si scorre normalmente
- **La posizione si misura, non si calcola**: chiedere all'elemento dov'è dà la
  stessa risposta di `indice × altezza` e continua a darla il giorno che una
  scena cambia altezza
- **L'accento è per sezione e statico**; quello globale che segue lo scorrimento
  è la PR 8, che l'osservatore ce l'ha già per `aria-current`
- **Nessuna scena è a sua volta scorrevole**, contro l'export: con due
  contenitori annidati le frecce non si sa a chi parlano
- **Il titolo di pagina si dice e non si mostra** — prima classe di utilità del
  progetto
- **Una sola immagine si carica subito**, quella della scena di apertura: non la
  prima del documento, che è in fondo all'archivio e non la vede nessuno
- **I target di build sono la soglia dei browser**, dichiarati in
  `astro.config.mjs`
- **Due immagini segnaposto** entrano nei contenuti d'esempio, dichiarate come
  tali

### Obiettivi

- [x] `/` è lo scroller a scroll-snap, con una sezione alta `--scene-height` per
      serata
- [x] Si apre sulla prima serata futura
- [x] `content-visibility: auto` e `contain-intrinsic-size` sulle sezioni,
      `loading="lazy"` sulle immagini oltre quella di apertura
- [x] L'accento segue il ciclo della serata a schermo
- [x] Titoli delle serate in `<h2>`, un solo `<h1>` di pagina
- [x] Layout responsive: due colonne su desktop, una su mobile con la foto in
      alto; testo sempre allineato a sinistra
- [x] Ogni scena porta `data-number`, `data-state`, `data-cycle`, il suo `id`, e
      quella di apertura `data-open`
- [x] I componenti della PR 6 fanno il lavoro che è loro: `Label`, `GuestRow`,
      `Button`
- [x] Una scena ha **un bottone solo**, che apre il modale: i materiali dietro
      «Rivedi la serata», la prenotazione dietro «Prenota il posto»
- [x] **Un solo `<dialog>` per pagina**, riusato da tutti i bottoni, riempito
      clonando markup che è già nella pagina
- [x] Con gli script spenti i link agli interventi restano link veri e visibili:
      la classe `no-js` sul documento decide quale delle due forme si vede
- [x] Due serate d'esempio hanno un'immagine segnaposto
- [x] La pagina provvisoria è stata rimossa, non estesa

### Test automatici

- Tante sezioni quanti sono gli eventi, nell'ordine giusto — ricavato dai
  contenuti, non scritto nel test
- Un solo `<h1>` nella pagina, e tanti `<h2>` quante sono le serate
- Ogni sezione ha `scroll-snap-align` e un'altezza intrinseca dichiarata
- L'accento di ogni sezione corrisponde al ciclo del suo evento
- Le immagini oltre quella della scena di apertura sono in `loading="lazy"`
- Lo script di apertura è in linea e non un modulo differito: bundlato girerebbe
  dopo la prima pittura, e il programma verrebbe disegnato in cima e poi
  salterebbe
- **Guardia**: la pagina è un solo contenitore scorrevole. Scritta sul conteggio
  e non sul nome della classe — una guardia agganciata a `.scene` smette di
  guardare il giorno che qualcuno rinomina. L'unica eccezione è ciò che sta
  dentro un `<dialog>`, e va **scritta nel selettore**: dal CSS non si vede che
  un `.modal-panel` è dentro un modale
- **Guardia**: ogni bottone che apre il modale trova il suo bersaglio nella
  stessa pagina, e di modali ce n'è uno solo. Un bersaglio che non risolve è un
  tocco che non fa niente — sul telefono, indistinguibile da un tocco non
  registrato. I bersagli si contano dove `getElementById` li troverebbe: un
  `id` scritto **dentro** un `<template>` non conta, perché quel contenuto è un
  documento inerte a parte — l'`id` *sul* template invece sì, ed è come si
  riempie il modale con il testo della prenotazione
- **Guardia**: i link agli interventi non stanno solo dentro un `<template>`.
  Lì sarebbero invisibili a chi non ha script, a un crawler e a Ctrl+F
- Una scena pubblica al massimo un bottone
- **Guardia**: nessuna media query pubblicata in sintassi range
- Le asserzioni sul fuso continuano a passare sui quattro ancoraggi, che era la
  promessa scritta nel `CLAUDE.md`
- Le guardie delle PR precedenti continuano a passare

> **Trovato scrivendo.** Un'asserzione sul CSS pubblicato — scritta per un'altra
> ragione, cioè per controllare che `content-visibility` arrivasse in `dist/` —
> ha fatto emergere che il minificatore riscriveva **ogni media query nella
> sintassi range**: `@media (width <= 900px)` invece di `max-width`. È Safari
> 16.4 contro una soglia dichiarata di 15.4, quindi su iOS 15.4–16.3 il layout
> mobile dello scroller non si applicava affatto e un telefono riceveva le due
> colonne del desktop su 390 px. Nessun errore da nessuna parte, e nel sorgente
> c'era scritto esattamente quello che doveva esserci: è il ripiego collassato
> della regola 4 in un altro travestimento. I target di build ora stanno in
> `astro.config.mjs` e una guardia legge il CSS pubblicato.
>
> Ed è la prima PR che pubblica una media query: il difetto esisteva da quando
> esiste il progetto e non aveva ancora avuto niente da rompere.

> **Trovato nel controllo manuale.** A 390×800 i bottoni dei materiali della
> serata 78 finivano sotto il bordo dello schermo, cioè irraggiungibili — la
> scena non è scorrevole per scelta, quindi quello che esce è perso. La causa
> era l'immagine della serata: `30vh` fissi, presi prima che il testo chiedesse
> il suo. Ora
> è una riga di griglia che prende quel che resta, e sotto certe altezze la
> scena cede in un ordine dichiarato — descrizione, immagine, presenze — senza
> mai toccare titolo, data, luogo, bottoni e nota. Le soglie sono due serie
> separate per i due layout: impilato si stringe presto, affiancato no, perché
> un portatile a 1440×900 ha spazio e tagliare lì avrebbe accorciato una
> descrizione che ci sta.
>
> **E l'immagine restava comunque minuscola**, perché il contenuto di una
> scena piena — due ospiti, due bottoni, presenze — non ci sta in una schermata
> per quanto lo si stringa. Da qui il **modale**, chiesto dal committente e
> anticipato dalla PR 12: una scena ha un bottone solo, e i link agli interventi
> stanno dietro di esso. La PR 12 è stata riscritta di conseguenza — le resta il
> contenuto vero della prenotazione, che è la parte che dipende da una questione
> aperta.
>
> Il caso senza JavaScript è stato discusso e non aggirato: i link restano
> `<a href>` veri nel markup e la classe `no-js` decide quale forma si vede, così
> non c'è contenuto che esista solo per chi ha gli script. Costava meno di
> anticipare la rotta `/78` e non perde niente rispetto a oggi.

> **Trovato nella revisione.** Otto difetti, e sono tutti la stessa specie: il
> sorgente dice una cosa e `dist/` ne pubblica un'altra, senza che niente
> diventi rosso.
>
> - `Astro.slots.has('portrait')` risponde sulla **presenza dello slot**, non su
>   ciò che disegna. Chi lo riempie scrive `{speaker.photo && <Image
>   slot="portrait" …/>}`, che quando la foto non c'è è uno slot che rende la
>   stringa vuota — e `has()` dice sì lo stesso. In `dist/` c'erano quattro
>   cornici da 56×56 vuote, una davanti a ogni nome, con il loro `gap`. Ora lo
>   slot si rende prima e la cornice si disegna solo se ne è uscito qualcosa
> - `.scene-photo` si pubblicava **anche senza locandina**. Su telefono è la riga
>   di griglia che prende quel che resta, con un fondo di `26vh`: le serate senza
>   immagine — quasi tutto l'archivio — si aprivano con un quarto di schermo
>   bianco sopra il proprio titolo e il testo schiacciato in fondo
> - Il clone che riempie il modale si portava dietro la classe `no-js-only`, che
>   è **la classe che lo nasconde**: il corpo si vedeva perché
>   `html:not(.no-js) .no-js-only` e la regola del modale pareggiano di
>   specificità, e a decidere era l'ordine con cui Astro linka due fogli. E si
>   portava dietro il proprio `id`, duplicato nel documento per tutto il tempo
>   che il modale resta aperto. Ora il clone li perde entrambi
> - Il ramo «`showModal` non c'è» **usciva senza rimettere `no-js`**, cioè
>   lasciava la pagina nella forma «gli script funzionano»: un bottone che non fa
>   niente sopra una lista di link nascosti. Su un browser sotto la soglia dei
>   15.4, che è esattamente quello per cui il meccanismo `no-js` esiste
> - Lo script di apertura **saltava sopra un `#serata-N` in arrivo** — i link che
>   la Timeline della PR 8 distribuisce — e correva contro lo scorrimento che il
>   browser fa da sé sul frammento, con esiti diversi da un motore all'altro. E
>   stava scritto dopo `</Base>`, quindi pubblicato **dopo `</html>`**: i browser
>   lo recuperano spostandolo nel body, ma è un errore di parsing e basta un
>   post-processore che tratti come scartabile ciò che sta lì
> - `<meta charset>` **non era più la prima cosa nella testa**, perché lo script
>   `no-js` gli era passato davanti. Innocuo finché quello script è ASCII, cioè
>   fino al giorno che qualcosa sopra la dichiarazione porta un accento — in un
>   progetto la cui regola sulla lingua è *accenti scritti per intero*
>
> Due erano **nei test**, che è la metà peggiore. L'asserzione «continua a
> funzionare con quello script spento» cercava `display: none` con lo spazio in
> un CSS minificato: non poteva diventare rossa mai, e riscritta con lo spazio
> avrebbe pescato le regole legittime di `.scene-description` e compagne. E
> `checkModalTargets` raccoglieva gli `id` anche dentro i `<template>`, dove
> `getElementById` non arriva: la guardia sarebbe rimasta verde proprio sul
> rifacimento che `checkLinksOutsideTemplates` esiste per vietare — bottone morto
> a runtime, suite verde.
>
> **Lo scroller ha preso `tabindex="0"`.** Il documento è alto una schermata sola
> e non scorre; il salta-a porta su `<main>`, il cui antenato scorrevole più
> vicino è quel documento fermo. Chi naviga da tastiera non aveva niente da
> premere — frecce, spazio e Page Down su nulla — finché il Tab non capitava su
> un link dentro una scena. Chrome e Firefox rendono focalizzabile un contenitore
> scorrevole da sé; Safari, cioè il browser per cui la soglia è scritta, no.
>
> **Tre sono rimaste aperte, di proposito.** Che una serata futura con materiali
> pubblichi due bottoni non è impedito nel componente: lo prende il test sul
> conteggio, che però diventa rosso indicando il file del contenuto invece del
> punto dove si decide — costa una regola editoriale, non una correzione. Il
> `max-height: 80vh` del pannello passa alla PR 16, che è dove le proporzioni su
> schermo piccolo si tarano una volta sola. E lo **stile della serata annullata**
> non è stato scritto: `data-state="cancelled"` si pubblica e nessuna regola lo
> legge. La barratura passa alla PR 9, dove una serata annullata ha già fra gli
> obiettivi di mostrare il suo stato e dove la si scrive una volta per la scena e
> per la pagina; il commento di `stateOf` in `src/lib/events.ts` e la decisione
> in [decisioni.md](decisioni.md) promettevano questa PR e adesso dicono quella.
> Una promessa lasciata nel codice a scadenza passata è la mezza verità che
> questo repository passa il tempo a cacciare.
>
> Resta una trappola, scritta qui perché la prossima persona non la ritrovi da
> sola: `checkSingleModal` conta le occorrenze di `<dialog` nel markup
> pubblicato, e `stripMarkupComments` toglie i commenti HTML, non quelli
> JavaScript. Scrivere quella parola in un commento **dentro** lo script in linea
> del modale fa scattare la guardia su un secondo modale che non esiste.

### Test manuali

- Con *movimento ridotto* attivo lo scroller diventa una lista che si scorre
  normalmente
- Con JavaScript disattivato la pagina si apre dalla prima serata e si scorre
  fino in fondo: il degrado dichiarato è quello che succede davvero
- Sotto i 900 px il layout passa a una colonna con la locandina in alto, e il
  testo resta allineato a sinistra; su finestra bassa la descrizione si taglia e
  la scena non trabocca
- **Su un iPhone vero**: lo snap non salta quando la barra degli indirizzi di
  Safari si ritrae; la posizione di apertura è esatta
- Su Android, stesso giro
- Con un contenuto finto da 81 serate, la pagina resta fluida su un telefono di
  qualche anno fa — è la misura rimandata in `vincoli-tecnici.md`

> **I tre test su telefono sono rimandati alla PR 15**, dove il sito ha un URL
> stabile che apre chiunque. Non è una spunta data per buona: chi lavora al
> progetto non ha un iPhone, e provarlo adesso vorrebbe dire un tunnel verso il
> server di sviluppo o un device remoto — più attenzione di quanta ne valga
> finché non c'è un indirizzo vero. Il rischio nel frattempo è retto per
> costruzione, non per fiducia: `--scene-height` è `svh` con il ripiego in
> `@supports`, e ogni scena dichiara la propria altezza intrinseca, che è ciò
> che tiene ferme le posizioni di snap. Il debito è scritto in
> [questioni-aperte.md](questioni-aperte.md), sotto *Da fare alla PR 15*.

---

## PR 8 — Timeline e navigazione da tastiera

**Branch:** `timeline` · **Dipende da:** 7

L'ultimo pezzo dello scroller. La PR 7 aveva lasciato scritto cosa mancava:
l'accento è per sezione e statico, e i link `#serata-N` «li distribuisce la
Timeline della PR 8».

### Decisioni prese scrivendo la PR

Per esteso in [decisioni.md](decisioni.md), sotto *La Timeline*. In breve:

- **Le tacche sono ancore, non bottoni.** L'export scrive `<button onClick>`, e
  quel bottone fa quello che qualcuno gli scrive; `<a href="#serata-81">` è
  l'elemento per una cosa che porta a un punto del documento, e arriva con
  l'indirizzo condivisibile, il tasto indietro, l'apri-in-nuova-scheda,
  l'annuncio da screen reader e il salto che il browser fa da sé. Costa **meno**
  del bottone: che funzioni senza script non è il motivo della scelta, è quello
  che la scelta più economica regala
- **Lo scorrimento morbido si dichiara come proprietà, mai come argomento.**
  `behavior: 'smooth'` passato a una chiamata batte il `scroll-behavior: auto
  !important` che `global.css` mette sotto `prefers-reduced-motion` — l'argomento
  vince sulla proprietà — e in `dist/` non se ne vede niente
- **L'accento globale sta su `<html>`**, che è il giorno previsto dal commento
  di `:where(:root)` in `colors.css`. Le scene continuano a vincere dentro di sé,
  perché le proprietà personalizzate ereditano dall'antenato più vicino
- **Una finestra di tacche, non tutte e ottantuno**, e la tacca porta la
  **distanza vera** dalla corrente: è ciò che permette al solo CSS di stringere
  la finestra a tre sul telefono, senza un secondo numero in uno script e quindi
  senza un markup sbagliato per chi gli script non li esegue
- **`aria-current` lo scrive la build**, sulla tacca della serata di apertura:
  in `dist/` non gira nessuno script, e una rotaia che aspettasse il suo
  arriverebbe senza niente marcato
- **La guardia `bersaglio` resta, con un compito diverso**: con le ancore non
  protegge più lo scorrimento — quello lo fa il browser — ma impedisce che
  `aria-current`, l'accento e la finestra lampeggino attraverso quaranta serate
  mentre lo scorrimento morbido le attraversa

### Obiettivi

- [x] Timeline verticale a destra su desktop, orizzontale in basso su mobile
- [x] Nessun divisore «oggi», come deciso
- [x] Token nuovi per le tacche: nell'export erano `color-mix` al 60% e al 34%
      sul crema, e oggi non hanno un equivalente — `--tick-near` e `--tick-far`,
      scritti `rgba(var(--cream-100-rgb), …)`. Il secondo non tiene il valore
      dell'export: il 34% compone 2,66:1 sul blu, ed è stato portato a 0,44
- [x] `aria-current` sulla tacca della serata a schermo
- [x] Navigazione da tastiera: frecce, PagSu/PagGiù, Home/Fine
- [x] Guardia `bersaglio` con timer da 1200 ms sullo scorrimento morbido, come
      nel codice del design
- [x] Le tacche sono ancore a `#serata-N` e funzionano con gli script spenti
- [x] L'accento globale segue la serata a schermo
- [x] La Timeline non introduce un secondo contenitore scorrevole
- [x] La finestra di tacche regge 81 serate senza sfondare la schermata

### Test automatici

- Tante tacche quanti sono gli eventi e nell'ordine del sito, ricavato dai
  contenuti
- Una sola tacca con `aria-current` in `dist/`, ed è quella della serata su cui
  il programma si apre
- Il rango di ogni tacca è la sua distanza vera dalla corrente
- `<html>` porta il ciclo della serata di apertura, ricavato dalla collection
- I due token nuovi arrivano in `dist/` come `rgba` sulla terna del crema, e
  nessun `color-mix` è rientrato
- Sotto `prefers-reduced-motion` il CSS pubblicato azzera scroll-snap e
  scorrimento morbido
- **Guardia** `checkTimelineLinks`: una tacca è un `<a href>` e non un
  `<button>`, e non è un `<a>` senza indirizzo
- **Guardia** `checkTimelineTargets`: ogni tacca punta a un `id` che esiste
  nella pagina — non a uno che gli somiglia, e non a uno chiuso in un
  `<template>`, dove `getElementById` non arriva
- **Guardia** `checkSmoothScrollArgument`: nessun `scrollTo`, `scrollBy` o
  `scrollIntoView` di `src/` passa `behavior: 'smooth'`. Legge il sorgente e
  lascia stare il foglio di stile, che è la forma corretta: la differenza sono
  le virgolette
- `checkSingleScroller` continua a passare con la rotaia in pagina, e la rotaia
  dichiara `overflow: hidden`
- Le guardie delle PR precedenti continuano a passare, e `npm run test:mutate`
  con loro: **45 su 45**

> **Trovato nel controllo manuale, e in nessun altro modo.** Due difetti, tutti
> e due invisibili con i quattro contenuti d'esempio e tutti e due fatali con
> l'archivio vero. È la ragione per cui il contenuto finto da 81 serate era a
> piano.
>
> - **Ottanta `gap` di niente.** La finestra nasconde la *tacca*, ma l'`<li>`
>   che la contiene resta un elemento flex, vuoto e alto zero — e il `gap` si
>   disegna fra elementi flex anche quando non contengono niente. Con 81 serate
>   erano mille pixel di rotaia vuota che spingevano le undici tacche visibili
>   sotto il bordo dello schermo. Adesso la spaziatura la porta la tacca, e
>   sparisce esattamente quando sparisce lei
> - **`justify-content: center` non centra quando non ci sta.** La barra del
>   telefono doveva ritagliare le undici tacche simmetricamente ai due lati; una
>   riga flex che trabocca viene invece allineata all'inizio — i motori si
>   rifiutano di perdere contenuto dal bordo iniziale — quindi la barra mostrava
>   le cinque serate più vecchie della finestra e quella corrente stava fuori
>   dallo schermo a destra. Da qui la distanza vera al posto dei tre ranghi
>   dell'export: la finestra si stringe a tre nel foglio di stile, dove è giusta
>   anche prima che parta uno script
>
> **E la rotaia era troppo stretta per le nostre date.** L'export dichiara
> `clamp(104px, 8.5vw, 140px)` e scrive `20 mar` sulle tacche; le nostre leggono
> `24 set 26`, con l'anno che la PR 3 ha aggiunto perché su ottantuno serate *18
> giugno* non identifica niente. Le date uscivano dal bordo destro dello
> schermo. La misura nuova è misurata e non copiata: 115px è quel che chiede la
> riga della tacca corrente, e il resto è il padding del design.

> **Non era un falso allarme, ed è stato corretto alla PR 9.** Questa nota
> diceva che `scrollIntoView()` che non muove niente era colpa della prova e non
> della pagina — due scorrimenti sovrapposti in un test scritto male. Sbagliato:
> il difetto era vero, e la prova ne coglieva solo il caso più facile da
> confondere con un errore di misura.
>
> Riprodotto alla PR 9 con un'azione qualunque: **due tacche toccate a due
> decimi di secondo di distanza**. Il secondo salto parte mentre il primo è in
> volo, il motore lo lascia cadere, e il programma resta sulla prima
> destinazione mentre rotaia, accento e indirizzo dicono la seconda — un sito
> che si contraddice, senza niente da vedere e senza niente che fallisca. Con
> `scroll-behavior: smooth` acceso lo stesso valeva per le frecce.
>
> La correzione sta nella PR 9 e ha tolto la proprietà: `scroll-behavior`
> raggiunge solo gli scorrimenti chiesti da uno script, qui sono tutti salti a
> una serata, e animarli comprava un'animazione al prezzo dell'unica cosa che
> quei salti devono fare. La regola 15 del `CLAUDE.md` dice adesso quello, e
> `checkSmoothScrollArgument` conta di più di prima.
>
> Resta la lezione che questa nota aveva mancato: **una prova che non
> riproduce non è una prova che assolve.** Archiviare un sintomo come artefatto
> della misura è il modo in cui un difetto vero sopravvive a chi lo ha visto.

### Test manuali

- Tastiera completa su desktop: frecce, PagSu/PagGiù, Home/Fine, con la messa a
  fuoco sempre visibile — provata anche su una tacca, dove l'anello arriva
  intero e non lo ritaglia la rotaia; e sulla barra del telefono, dove prima
  dell'aggiustamento del margine interno non se ne vedeva niente
- Con un contenuto finto da 81 serate: la finestra segue lo scorrimento, undici
  tacche sul desktop e tre sulla barra del telefono, la rotaia non sfonda la
  schermata. È la prova che ha trovato i due difetti qui sopra
- Sotto i 900 px la rotaia diventa la barra in basso e la nota della scena le
  resta sopra, senza sovrapposizioni
- Con JavaScript disattivato le tacche restano link che portano alla serata
  giusta, e il salto è istantaneo: `scroll-behavior: smooth` lo accende lo
  script, dopo il salto di apertura — assegnare `scrollTop` obbedisce alla
  proprietà, quindi acceso prima avrebbe fatto scendere l'apertura in
  animazione da cima all'archivio

> **Due prove restano da fare, dichiarate e non date per buone.** Su un iPhone
> vero: toccare una tacca lontana e verificare che lo scorrimento morbido arrivi
> a destinazione senza essere interrotto dallo snap.
> [questioni-aperte.md](questioni-aperte.md) la colloca già alla PR 15, per
> nome, e per lo stesso motivo della PR 7 — prima non c'è un URL stabile e chi
> lavora al progetto non ha un iPhone. Nel frattempo il rischio è retto dal
> fatto che il salto è quello nativo del browser sul frammento e non uno
> `scrollTo` scritto qui.
>
> E l'annuncio della serata corrente da parte di uno screen reader: il markup
> che serve è `aria-current` su una tacca sola, che è verificato in `dist/`,
> ma il verificare che *si senta* è un ascolto e non un'asserzione.

---

## PR 9 — Le pagine delle serate

**Branch:** `pagine-serata` · **Dipende da:** 7 e 8

Il piano diceva «una pagina per serata» e lasciava intendere un documento
diverso dallo scroller. Non lo è: **è lo stesso scroller, servito a ottantuno
indirizzi**, che si apre su una serata diversa e porta i meta di quella. `/81`
non è una pagina della serata 81 — è il programma aperto sulla serata 81.

È ciò che rende vero il motivo per cui quegli URL esistono: il numero nudo serve
alle anteprime su WhatsApp e Facebook, che vengono dai meta Open Graph e non
dallo slug.

### Decisioni prese scrivendo la PR

Per esteso in [decisioni.md](decisioni.md), sotto *Le rotte delle serate*. In
breve:

- **Lo scroller diventa un componente**, `Programme.astro`, e le due rotte lo
  usano: copiarlo nella seconda pagina sarebbe due sorgenti per una schermata
- **L'indirizzo segue la serata a schermo**, con `history.replaceState` — mai
  `pushState`, che lascerebbe una voce di cronologia per ogni serata
  attraversata — e **si aggiorna al cambio, non all'apertura**: `/` riscritto in
  `/81` appena la pagina si apre darebbe a un segnalibro sulla radice un
  indirizzo che invecchia
- **L'`<h1>` di ogni rotta nomina la sua serata**, invisibile come prima: è la
  sola cosa dentro il corpo che distingue ottantuno documenti uguali per chi li
  indicizza
- **La foto tema diventa un'immagine da anteprima 1200×630**, ritagliata da
  `astro:assets` e generata solo quando c'è il dominio, perché è solo allora che
  il layout la pubblica
- **Una serata annullata entra nei contenuti d'esempio**, prima di quella di
  apertura, perché il ramo `cancelled` non si vedeva in `dist/` e il test poteva
  solo pretendere che la regola esistesse
- **La barratura si aggancia a `data-state="cancelled"`** e sta in `Scene.astro`,
  che è l'unico posto: la rotta `/80` è quella stessa scena, aperta su di lei

### Obiettivi

- [x] Rotta `/[number]`, una per serata, che rende lo scroller aperto su quella
- [x] Lo scroller è un componente solo, usato da `/` e da `/[number]`
- [x] Ogni rotta porta titolo, descrizione e immagine della sua serata nei meta;
      `og:image` esce quando arriva il dominio
- [x] Un `<h1>` per pagina, invisibile, che nomina la serata di quella rotta
- [x] `data-cycle` di ogni rotta è quello del ciclo della sua serata
- [x] L'URL si aggiorna alla serata a schermo, senza voci nella cronologia
- [x] Una serata annullata conserva pagina e numero, e mostra il suo stato
- [x] La barratura si aggancia a `data-state="cancelled"`, scritta una volta
- [x] Una serata annullata d'esempio, prima di quella di apertura

### Test automatici

- Una rotta per ogni evento, coi percorsi ricavati dai contenuti
- Ogni rotta si apre sulla **sua** serata, e `/` sulla prima ancora da svolgere:
  scritto come contratto e non ricalcolato da un orologio — la scena di apertura
  è *in programma*, e tutte quelle che la precedono sono passate o annullate
- Ogni rotta pubblica titolo e descrizione della sua serata, non del sito, e
  `og:description` dice la stessa cosa del meta
- **Quando `site` è impostato**, ogni rotta con una foto pubblica `og:image`
  assoluto: scritto ora, si accende alla PR 15
- Gli `<h1>` di due rotte sono diversi, e quello della radice non nomina nessuna
  serata
- **Guardia** `checkEveningRoutes`: ogni `data-number` pubblicato trova la sua
  rotta in `dist/`. È l'indirizzo che lo script scrive nella barra — un numero
  senza rotta è un 404 che compare solo quando qualcuno ricarica o condivide
- **Guardia** `checkHistoryPush`: nessuno script di `src/` impila una voce di
  cronologia. È la differenza fra `replaceState` e `pushState`, cioè fra un
  tasto indietro che esce dal sito e uno che risale l'archivio
- La serata annullata: la sua rotta esiste, pubblica `data-state="cancelled"`, e
  nessuna rotta si apre su di lei per difetto
- La barratura esiste nel CSS pubblicato ed è agganciata a `data-state`
- **Nessun `scroll-behavior: smooth` nel CSS pubblicato**, che è la correzione
  qui sotto, letta dove la rimetterebbe chi la rimettesse
- Le guardie precedenti continuano a passare su ogni rotta nuova, e
  `npm run test:mutate` con loro: **47 su 47**

> **Trovato provando, e non era di questa PR.** Con lo scorrimento morbido
> acceso, **un salto interrotto da un altro salto viene lasciato cadere dal
> motore**: si toccano due tacche a due decimi di distanza e il programma resta
> sulla prima destinazione mentre rotaia, accento e indirizzo dicono la seconda.
> Con le frecce lo stesso. Nessun errore, niente in `dist/`, e un sito che si
> contraddice.
>
> La PR 8 l'aveva visto e l'aveva archiviato come un errore della prova — due
> scorrimenti sovrapposti in un test scritto male — perché nella forma in cui si
> era presentato *era* indistinguibile da quello. La differenza è che adesso ha
> una riproduzione che è un'azione qualunque di un lettore qualunque.
>
> La correzione è togliere `scroll-behavior: smooth`. Non è una rinuncia
> scambiata con la correttezza: quella proprietà raggiunge **solo** gli
> scorrimenti chiesti da uno script, e qui sono tutti salti a una serata, quindi
> tutto quello che comprava era rendere interrompibile l'unica cosa che quei
> salti devono fare. In cambio `prefers-reduced-motion` è soddisfatto per
> costruzione invece che da una regola che deve continuare a vincere, e sparisce
> la macchinetta che accendeva la proprietà sull'evento `load`.
>
> La guardia `bersaglio` resta, con un compito che è rimasto uno solo: un salto
> sul frammento lo fa il browser, non noi, e Safari è il motore che questo
> progetto non vede finché il sito non è pubblicato.

> **Trovato in revisione.** Undici difetti, e i tre che contano stanno tutti
> nella stessa zona: quello che succede quando qualcosa va storto in mezzo a
> un'altra cosa.
>
> **`history.replaceState` può lanciare.** WebKit rifiuta più di cento scritture
> di cronologia in trenta secondi, e tenere premuta una freccia dalla prima
> serata all'ultima e ritorno ci arriva. Lanciata da lì, l'eccezione usciva da
> `aim()` fino al gestore dei tasti — che ha già chiamato `preventDefault()` e
> non ha ancora scorso: le frecce avrebbero smesso di muovere il programma per
> il resto della finestra, con lo scorrimento nativo soppresso e niente al suo
> posto. Adesso è dentro un `try`, e l'indirizzo che resta indietro è tutto il
> prezzo di aver toccato il limite.
>
> **`decodeURIComponent` pure.** Un frammento che non è codifica percentuale
> valida — `/81#%` — faceva morire l'intera funzione di apertura, e la rotta si
> apriva in cima all'archivio invece che sulla serata che nomina: cioè si
> perdeva la ragione per cui `/81` esiste, per un carattere di troppo
> nell'indirizzo scritto da qualcun altro.
>
> **E `loadProgramme()` veniva rieseguita per ogni rotta**: ottantadue letture
> delle stesse quattro collection, con ciclo, sede e relatori risolti da capo
> ogni volta — quadratico nella dimensione di un archivio che può solo crescere.
> Adesso è memoizzata, **ma solo durante una build**: in `astro dev` il modulo
> sopravvive al salvataggio di chi scrive, e un programma in cache continuerebbe
> a servire le serate com'erano all'avvio del server. Non mostrare la modifica è
> l'unica cosa che un'anteprima non può fare, e dalla PR 14 quei file li scrive
> il CMS. Con 81 serate la build passa da 3,8 a 3,1 secondi, ma il numero che
> conta è l'esponente.
>
> Due erano nei test: niente pretendeva che l'indirizzo venisse **riscritto** —
> `checkHistoryPush` vieta la chiamata sbagliata e non chiede quella giusta,
> quindi cancellando la riga la suite restava verde e la regola 16 non era
> tenuta da nessuno — e tre asserzioni usavano `home!` senza mai controllare che
> ci fosse.
>
> Una l'ho chiusa contro il parere della revisione, che l'aveva lasciata aperta:
> **l'immagine da anteprima si generava anche senza dominio**, cioè un JPEG per
> serata che nessuna pagina referenziava. Con l'archivio pieno sono ottantuno
> ridimensionamenti e ottantuno file morti in ogni deployment. Generarla solo
> quando c'è il dominio non toglie niente alla promessa che alla PR 15 non ci
> sia niente da ricordarsi: arriva il dominio e arrivano le immagini.
>
> **Due sono rimaste aperte, di proposito.** Il `<title>` di una serata non
> nomina l'associazione, mentre quello della radice sì: è una scelta di testo
> italiano e la si fa guardandola, non correggendola di nascosto. E `og:type`
> resta `website` anche sulle rotte delle serate: cambiarlo è una decisione sul
> layout condiviso, e il posto dove si prende è la PR 15, insieme al resto dei
> meta.

### Test manuali

- Si entra da `/81`, si toccano due tacche in rapida successione, e il programma
  atterra sulla **seconda** — con rotaia, accento e indirizzo che dicono la
  stessa cosa. È la prova che ha trovato il difetto qui sopra
- Frecce, Home e Fine muovono il programma e l'indirizzo insieme
- Si entra da `/`, non si tocca niente, e l'indirizzo resta `/`; la cronologia
  non cresce di una voce per serata attraversata
- `/80` si legge come una serata annullata e non come un errore: titolo e data
  barrati, l'etichetta «annullata», la nota «Serata annullata»
- Con un contenuto finto da 81 serate: **84 pagine in 3,8 secondi**, `dist/` di
  18 MB, una rotta di 202 KB che compressa ne fa **14** — sotto la stima di
  20–25 KB di [vincoli-tecnici.md](vincoli-tecnici.md) — e 109 file in tutto,
  contro i 20.000 che Cloudflare Pages concede per deployment

> **Rimandata alla PR 15**: l'anteprima di un link su WhatsApp e su Facebook.
> Senza dominio non c'è niente da incollare in una chat e `og:image` non viene
> emesso — il layout lo omette apposta, perché un URL relativo lì dentro
> «sembra giusto nel markup e l'anteprima esce senza figura». Il test è scritto
> e si arma da solo quando `site` compare in configurazione.

---

## PR 10 — Il piano: la Timeline che raggiunge l'archivio

**Branch:** `piano-timeline-archivio` · **Dipende da:** nulla

Un passo che non tocca il codice, e sta nell'elenco perché **il numero di un
passo è il numero della sua PR su GitHub**: saltarlo vorrebbe dire che da qui in
avanti i due elenchi non combaciano più, e a quel punto «la PR 12» non
identifica niente senza chiedere quale dei due si intende.

Ha fatto due cose. Ha aggiunto al piano il passo che mancava — la rotaia
mostrava undici tacche su ottantuno, quindi non raggiungeva l'archivio — e ha
rinumerato quelle dopo, 55 riferimenti in 16 file, in ordine decrescente perché
ogni numero scritto fosse già stato liberato.

L'ha trovato il committente guardando la barra su un telefono, non un test.

### Perché è una PR e non una riga in un commit

Su `main` non si spinge mai direttamente, «compresa quella di una riga e
compresa la documentazione». E tenuta separata dal codice per una ragione
pratica: mescolata all'implementazione, il diff della rinumerazione l'avrebbe
sepolta, e un rinominare a metà è esattamente il modo in cui questa cosa
fallisce.

### Obiettivi

- [x] Il passo nuovo è nel piano, con i suoi obiettivi e i suoi test
- [x] I passi dopo di lui scalano di uno, ovunque siano nominati
- [x] Le intestazioni vanno da 1 a N senza buchi, e non esiste nessun numero
      oltre l'ultimo
- [x] Le righe `Dipende da` con numeri spostati seguono il loro riferimento

### Test automatici

Nessuno nuovo: il codice non cambia. La suite gira lo stesso, perché i
riferimenti spostati stanno anche nei messaggi delle guardie e nei loro test —
`checkOpenGraph` nomina la PR che porta il dominio, e quel nome è confrontato
con una stringa.

---

## PR 11 — La Timeline raggiunge l'archivio

**Branch:** `timeline-archivio` · **Dipende da:** 8

La Timeline mostra undici tacche sul desktop e tre sulla barra del telefono. Con
quattro serate d'esempio si vedono tutte; con ottantuno si raggiungono solo le
vicine — sul telefono la precedente e la successiva. Per arrivare alla
dodicesima si scorrono settanta schermate.

Cioè la rotaia non fa la cosa per cui esiste, che è saltare. È un difetto della
PR 8: il suo obiettivo diceva «la finestra di tacche regge 81 serate senza
sfondare la schermata», e lo fa — al prezzo di renderle irraggiungibili, che
nessuno aveva scritto. L'export ha lo stesso limite e non ci è mai arrivato,
perché nei file di design le serate sono sei.

**Va fatta prima della 15**, la pubblicazione: pubblicare una rotaia che non
raggiunge l'archivio è pubblicare il difetto.

### Decisioni prese scrivendo il piano

- **Un quarto rango: il marchio nudo.** Le tacche fuori dalla finestra
  etichettata non spariscono più, restano come trattino senza data. Ottantuno
  trattini stanno in circa 650px su una colonna alta 900, quindi l'archivio
  intero diventa presente e toccabile e le date restano leggibili dove si sta.
  Non aggiunge un meccanismo: aggiunge un valore a una scala che c'è già, e la
  tacca porta **già** la distanza vera invece di un rango tagliato a due — è la
  decisione della PR 8 che paga adesso
- **Sul telefono la barra scorre in orizzontale.** Ottantuno trattini ci
  starebbero anche lì, ma un bersaglio da quattro pixel per un dito non è un
  bersaglio. La barra scorrevole è come funziona ogni selettore di date su un
  telefono, e tiene le pillole con la loro data
- **E l'eccezione si scrive nel selettore.** `checkSingleScroller` pretende un
  solo contenitore scorrevole per pagina, e il motivo scritto è l'annidamento:
  due scroller verticali uno dentro l'altro rendono ambigue le frecce. Una barra
  fissa che scorre in orizzontale, fuori dallo scroller, non crea
  quell'ambiguità — ma dal CSS non si vede che `.timeline-strip` è una barra e
  non una scena, quindi l'eccezione va **nominata**, come
  `dialog.modal .modal-panel`
- **La posizione iniziale della barra la dà uno script, e senza si perde.**
  `scrollLeft` non lo imposta nessun foglio di stile: un lettore senza script
  vedrebbe le pillole della prima serata mentre `aria-current` sta su una fuori
  schermo. È una degradazione **nuova** — oggi la barra è giusta anche senza
  script — e si accetta perché una barra vive per essere toccata, e un bersaglio
  che un dito non prende non serve a nessuno. L'alternativa scartata era i
  marchi nudi anche sul telefono: niente si degrada, e il bersaglio torna a
  quattro pixel

### Obiettivi

- [x] Ogni serata ha la sua tacca **visibile**, su tutte e due le larghezze
- [x] Sul desktop le tacche fuori dalla finestra sono marchi senza data
- [x] Sul telefono la barra scorre in orizzontale, e la tacca corrente resta in
      vista mentre si legge
- [x] L'eccezione a `checkSingleScroller` è scritta nel selettore e argomentata
- [x] Il bersaglio da toccare resta ragionevole su tutte e due le larghezze
- [x] Quello che si degrada senza script è dichiarato

### Test automatici

- Tante tacche **visibili** quanti sono gli eventi: è l'asserzione che oggi
  manca, ed è quella che avrebbe preso questo difetto alla PR 8
- La finestra etichettata resta quella, e i marchi nudi non portano date
- **Guardia**: `checkSingleScroller` continua a passare con la barra come
  seconda eccezione nominata, e il suo caso negativo prova che una `.scene`
  scorrevole viene ancora segnalata
- Con un contenuto finto da 81 serate la rotaia non sfonda la schermata
- Le guardie precedenti continuano a passare, e `npm run test:mutate` con loro

> **Trovato scrivendo.** Due, e tutt'e due riguardano cose che stanno **fuori**
> dalla scatola che si tocca.
>
> **Il bersaglio era alto due pixel.** Il passo delle tacche nude è di sei, ma
> scritto come margine: il margine sta fuori dalla scatola e non prende il clic,
> quindi restavano i due pixel del trattino — un link che nessuno può centrare
> apposta. Portato a padding, che sta dentro: stesso passo, bersaglio di sei.
>
> **E il minificatore collassa `overflow-x` e `overflow-y` nella
> scorciatoia.** Nel sorgente la barra dichiara i due assi separati; in `dist/`
> arriva `overflow: auto hidden`, e l'asserzione scritta come si digita il CSS
> falliva su un foglio esatto. La guardia invece la leggeva bene, perché la
> scorciatoia la sapeva già interpretare — quindi l'asserzione adesso usa il suo
> parser invece di un secondo modo di leggere la stessa cosa. È il ripiego
> collassato della regola 4 nella sua forma più mite: qui non si perde niente,
> si riscrive soltanto, e la risposta è la stessa — leggere `dist/`, e leggerlo
> come lo legge il codice.

### Test manuali

- Con 81 serate finte: dalla rotaia si arriva alla dodicesima in un tocco, sul
  desktop e sul telefono — **fatto**: 82 tacche, tutte visibili, undici
  etichettate, la striscia alta 702px in una rotaia da 757. Un trattino a sei
  tacche dalla cima porta alla serata 6, con indirizzo, accento e finestra che
  la seguono
- Sul telefono la barra scorre: striscia da 7168px in una barra da 593, e lo
  script la porta sulla pillola corrente all'apertura — **fatto**
- Il bersaglio si prende con un dito, non con un puntatore
- Con gli script spenti, quello che succede è quello che è scritto

---

## PR 12 — La prenotazione dentro il modale

**Branch:** `modale-prenotazione` · **Dipende da:** 9

**Riscritta alla PR 7.** Il modale è arrivato lì, chiesto dal committente e
imposto dal layout: una scena con un bottone per registrazione non stava in una
schermata. Quello che resta qui è la parte che alla PR 7 non poteva esserci —
l'informazione vera della prenotazione e il numero a cui scrivere, che è una
questione aperta e non una riga di codice.

Il modale, e quindi già fatto: uno solo nel DOM riusato da tutte le serate; si
chiude con Esc e con un clic fuori, la messa a fuoco resta dentro e torna al
bottone che l'ha aperto — è `<dialog>` con `showModal()`, non codice nostro;
presente su entrambe le larghezze.

### Decisioni prese scrivendo la PR

Le nove per esteso stanno in [decisioni.md](decisioni.md), sotto *La
prenotazione*. In breve:

- **Il numero sta in un modulo puro**, `src/lib/contact.ts`, che costruisce
  anche i link: è configurazione, e una seconda copia scritta a mano è giusta il
  giorno che la si scrive e sbagliata il giorno che il numero cambia. Non in una
  collection, che è l'archivio delle serate e non la rubrica
- **Il modulo rifiuta un numero che non riconosce** invece di scriverlo: senza
  prefisso internazionale il link è valido e raggiunge un'altra persona, o
  nessuna, e non fallisce da nessun'altra parte
- **Il messaggio precompilato nomina la serata**, perché di serate prenotabili
  ce ne sono due o tre alla volta; nome e numero di persone li aggiunge chi
  scrive, come il pannello chiede
- **Quindi il testo della prenotazione diventa uno per serata, dentro la
  scena.** Era unico finché il pannello diceva la stessa cosa a tutte; ora
  contiene il link, e il link nomina la serata. L'alternativa — far riscrivere
  l'indirizzo allo script — è il modale che costruisce contenuto dai dati invece
  di clonarlo
- **Il bottone porta due forme e il CSS sceglie**, come il bottone e la lista
  dei materiali. Copre anche il browser senza `<dialog>`, dove `Modal.astro` si
  rimette `no-js` da sé
- **Senza script si perde la spiegazione, non l'azione**: il link parte col
  messaggio già scritto

### Obiettivi

- [x] Il testo della prenotazione dice l'informazione reale: sessanta posti, si
      scrive con nome e numero di persone, risposta entro sera
- [x] Link `wa.me` al numero vero, configurato **in un posto solo**, e nessun
      altro file di `src/` può scriverne uno
- [x] Con gli script spenti il bottone «Prenota il posto» è un link diretto a
      WhatsApp invece di un bottone morto: è il fallback che alla PR 7 non
      esisteva perché non esisteva il numero
- [x] Il numero esce da [questioni-aperte.md](questioni-aperte.md)

### Test automatici

- **Guardia** `checkWhatsappSource`: nessun indirizzo WhatsApp e nessuna
  occorrenza di quelle cifre fuori da `src/lib/contact.ts`. I commenti non
  contano — una guardia che segnala la prosa che la spiega è una guardia che
  qualcuno spegne — e il caso negativo prova che sotto quel commento il codice
  continua a essere letto
- **Guardia** `checkPlaceholderNumber` sul pubblicato: il segnaposto del design
  non compare in `dist/` in nessuna delle sue sei scritture. Legge i numeri come
  li scrive una persona, e si rifiuta di chiamare numero una sequenza a gruppi
  di una cifra — un path SVG è dieci cifre e nove spazi
- Ogni `wa.me` in `dist/` porta le cifre del numero configurato, e **l'attesa si
  ricava importando il modulo**: un numero scritto nel test sarebbe la seconda
  copia che questa PR esiste per vietare
- Ogni link porta un `text=` non vuoto che nomina la serata da cui parte, e il
  messaggio si confronta con quello che scrive il dominio — non con una frase
  ricopiata qui, che diventerebbe rossa il giorno che qualcuno la migliora
- Il bottone sta su **tutte e sole** le scene `data-state="upcoming"`, con le
  due forme per ciascuna e il pannello con l'id che il bottone chiede: una
  serata passata che offre una prenotazione è un posto venduto per una sera che
  è già stata
- Il link di prenotazione di ogni serata esiste **fuori** dai template:
  `checkLinksOutsideTemplates` riceveva i soli materiali e da qui riceve anche
  questi — è ciò che prova che il ripiego è markup vero e non una promessa
- La rotta di una serata offre la stessa prenotazione del programma, che è poi
  un'asserzione sul fatto che le due rotte condividano un componente
- **Unit** su `contact.ts`: la normalizzazione, i separatori che un elaboratore
  di testi sostituisce senza che si veda, il rifiuto di ciò che non è un numero,
  e la codifica di apostrofi e trattini lunghi che arrivano dai titoli
- **Guardia** `checkNoJsSwitch` sul CSS che ogni pagina riceve: le due metà
  dell'interruttore `no-js` nascondono davvero, e con `!important` — vedi qui
  sotto
- `npm run test:mutate` continua a dire N su N, con le tre guardie nuove dentro

> **Trovato scrivendo, e non era di questa PR.** L'interruttore che decide
> quale delle due forme vede un lettore — `.no-js .only-js` e
> `html:not(.no-js) .no-js-only` — **funzionava a metà dalla PR 7**, e nel
> sorgente le due righe sono simmetriche.
>
> `.no-js .only-js` sono due classi, e due classi è anche quanto pesa il
> `.button[data-astro-cid-…]` in cui si compila lo stile di un componente: un
> pareggio, e un pareggio lo decide l'ordine dei fogli, che metteva ultimo il
> componente. La metà che nasconde il *link* vinceva — `html:not(.no-js)` porta
> anche un elemento, quindi sta un punto sopra — e la metà che nasconde il
> *bottone* perdeva. Il risultato è la peggiore delle combinazioni: con gli
> script spenti la serata 78 pubblicava un «Rivedi la serata» morto **sopra** la
> lista di link che avrebbe dovuto sostituire, e ogni serata futura avrebbe
> pubblicato un «Prenota il posto» morto sopra il proprio link a WhatsApp —
> cioè esattamente il difetto che l'obiettivo 3 di questa PR dichiara di
> chiudere.
>
> Trovato aprendo il sito **costruito** e rimettendo la classe a mano, non
> leggendo `global.css`. Ora tutt'e due portano `!important`, che è il livello
> giusto per una regola che non è stile ma «per questo lettore quell'elemento
> non esiste» — deve battere qualunque cosa un componente dichiari sul proprio
> `display`, compreso il giorno che qualcuno aggiunge un `display: grid` a una
> variante. La guardia legge `dist/` e non `global.css`, perché quel che era
> sbagliato non è mai stato in quel file: era dove quel file atterrava.

### Test manuali

- Esc, clic fuori, e ritorno della messa a fuoco al bottone
- Sul telefono, il link apre davvero WhatsApp con il messaggio precompilato
- Con gli script spenti, il bottone porta comunque a WhatsApp
- Il pannello su una serata di un ciclo che non sia il primo: il link prende
  l'accento del ciclo, che è la regola già scritta in `Modal.astro`

---

## PR 13 — Chi siamo, contatti, rassegna disabilitata

**Branch:** `pagine-istituzionali` · **Dipende da:** 6, 12

Fino a qui il sito è una schermata sola. Questa PR ne aggiunge due, e con esse
la cosa che finora non serviva a nessuno: **un modo per raggiungerle**. La
navigazione è il pezzo grosso di questa PR, non le pagine.

E i testi non ci sono. Li darà il committente; quello che entra adesso è
**segnaposto palese** — lorem ipsum, `Nome Cognome`, cifre a `0000` e `9999`.
Un segnaposto credibile — quattro persone con nome e cognome, «1.400 persone
passate in sala» — è il difetto che questo repository passa il tempo a cacciare:
una pagina perfetta e falsa non fallisce da nessuna parte, e nessuno la rilegge.
Un lorem ipsum fallisce a colpo d'occhio. Per non lasciare comunque tutto alla
buona volontà, i segnaposto stanno in un modulo solo, si dichiarano nel markup, e
**la loro presenza diventa un test rosso il giorno che il sito prende un
dominio**.

### Decisioni prese scrivendo la PR

Le quindici per esteso stanno in [decisioni.md](decisioni.md), sotto *Le pagine
istituzionali e la navigazione*. In breve:

- **La navigazione sta nel layout**, con `CycleAccents` e `ClipShapes`, per il
  criterio della PR 5: dimenticarla non fa fallire niente, pubblica una pagina
  che si legge benissimo e da cui non si esce
- **Le voci sono `<a href>`, non bottoni**, e l'indicatore scorrevole misurato in
  JavaScript diventa `aria-current="page"`: è la regola 14 applicata alla seconda
  rotaia del sito
- **La tendina del telefono è `<details>/<summary>`**, che si apre senza script.
  Si perde la chiusura al clic fuori, che è un handler
- **L'elenco è reso due volte** — riga e tendina, da `NAVIGATION` — perché un
  `<details>` forzato aperto sul desktop non è una cosa che il CSS d'autore possa
  fare sulla soglia di browser dichiarata
- **«Rassegna stampa» è testo e non ha una pagina**, e a tenerlo così è
  `checkInternalLinks` invece di una regola ripetuta
- **L'indirizzo si compone in un posto solo**, `venues.ts`: la collection ce
  l'aveva da sempre, ma la *scrittura* era a mano e ce n'erano già due che non
  concordavano
- **Il segnaposto telefonico del design non si pubblica**, e l'email si pubblica
  marcata: la casella non esiste ancora
- **I segnaposto stanno in `placeholder.ts`, si dichiarano con `Placeholder` e
  non sopravvivono al dominio**

### Obiettivi

- [x] `SiteNav.astro`, incluso da `Base.astro`: marchio esteso, quattro voci,
      `aria-current="page"` sulla corrente
- [x] Le voci sono link; «Rassegna stampa» è testo e non un link, e `/rassegna`
      non esiste
- [x] Sul telefono la tendina è `<details>` e si apre con gli script spenti
- [x] `/chi-siamo`: manifesto, come nasce, valori, persone, sede, numeri —
      struttura del design, testi segnaposto palesi
- [x] `/contatti`: WhatsApp che funziona, email dichiarata segnaposto, dove si è
- [x] L'indirizzo è **Palazzo ex Venchi Unica, Piazza Massaua 17/b, Torino** in
      ogni punto del sito, `Scene.astro` e `componenti.astro` compresi, e si
      compone in un posto solo
- [x] Nessun `011 000 0000` e nessun *Fratelli Rosselli* in `dist/`
- [x] I segnaposto stanno in `src/lib/placeholder.ts`, sono marcati nel markup e
      visibili come tali a chi legge
- [x] Il salta-a delle due pagine porta al contenuto, non «al programma»
- [x] `npm test`, `npm run check` e `npm run test:mutate` verdi, con le guardie
      nuove dentro: **57 su 57**

### Test automatici

Guardie nuove, ognuna con il suo caso negativo:

- **`checkInternalLinks`** — ogni `href` interno di una pagina pubblicata trova
  un file in `dist/`. È la sorella di `checkEveningRoutes`: lì l'indirizzo
  esisteva e la pagina no, qui è il link. I casi negativi sono `/rassegna`, uno
  `/chisiamo` scritto male e un `contatti` relativo scritto su `/chi-siamo`, che
  raggiunge `/chi-siamo/contatti`
- **`checkAnchorsWithoutHref`** — nessun `<a>` senza indirizzo nel pubblicato,
  con l'unica eccezione scritta *e verificata* qui sotto
- **`checkEmailSource`** — nessun `mailto:` e nessuna copia dell'indirizzo fuori
  da `contact.ts`, con i commenti che non contano
- **`checkStaleVenue`** — gli indirizzi del design non compaiono nel sorgente né
  in `dist/`, letti attraverso un a capo e in qualunque maiuscola
- **`checkPlaceholderText`** — ogni segnaposto pubblicato sta dentro un
  `[data-placeholder]`; **`checkPlaceholderSource`** — nessuno è scritto fuori
  dal modulo; **`checkNoPlaceholders`** — con `site` impostato, un solo blocco
  marcato è una violazione
- **`checkPlaceholderNumber`** prende la seconda costante, `011 000 0000`
- **`checkAccentContrast`** prende un minimo: 3:1 contro una superficie, 4,5:1
  contro l'inchiostro scritto sull'accento

Sul pubblicato:

- La navigazione è su ogni pagina, con le voci che dichiara `navigation.ts` —
  l'attesa si ricava dal modulo
- Le marcature `aria-current="page"` sono **due** sulle rotte che stanno in
  navigazione, una per forma, e **zero** su `/componenti`; su `/81` la voce
  corrente è «Programma», perché `/81` è il programma
- Nessuno script nomina la navigazione: è ciò che riporterebbe indietro la
  decisione sul `<details>` senza toccare il markup
- L'indirizzo pubblicato sulle due pagine e nelle scene è quello che la
  collection scrive, con l'attesa ricavata dal contenuto
- Ogni `wa.me` della pagina contatti porta le cifre configurate e il messaggio
  che **non nomina una serata**
- I segnaposto: nessuno fuori da un blocco marcato su nessuna pagina, e le due
  pagine ne portano davvero — altrimenti la verifica passerebbe sul vuoto
- Il lettore lo vede, e non solo il markup: la cornice tratteggiata e la
  targhetta «Segnaposto» sono lette nel CSS che quelle pagine ricevono

> **Trovato accendendo la guardia.** Il titolo di «Come nasce» stava **fuori**
> dal blocco marcato, ed è la prima cosa che `checkPlaceholderText` ha detto: un
> `<h2>` di lorem ipsum pubblicato senza cornice si legge come una frase che
> qualcuno ha scritto. La targhetta e il markup si erano già separati alla prima
> pagina scritta con essi, che è esattamente il motivo per cui la cornice e
> l'attributo li mette lo stesso componente.

> **La guardia sui link ha incontrato l'unico `<a>` senza indirizzo legittimo del
> repository**, ed è stata la PR 6 a scriverlo: il link disabilitato di `Button`,
> che porta `role="link"` **e** `aria-disabled="true"` — senza il ruolo un `<a>`
> senza href è generico e l'attributo non qualifica niente, che è la versione
> dell'export tolta allora. L'eccezione quindi non è «un `<a>` senza href a volte
> va bene»: è «spento *e lo dice*», e la guardia pretende tutt'e due gli
> attributi. Metà di quella coppia adesso è una violazione con un messaggio suo.

> **Il 4,5:1 sull'inchiostro non può fallire su questo fondo, e i conti stanno
> scritti.** Sembrava la scoperta della PR 6 — il 3:1 verificato contro il fondo
> della pagina mentre `EventCard` disegnava l'accento su `--surface-raised` — e
> invece no: passare 3:1 contro `#003049` mette un colore sopra 0,179 di
> luminanza, e sopra 0,175 si è già oltre 4,5:1 contro il nero. I sei colori del
> repository stanno fra 5,89 e 8,43. La verifica resta perché una delle sue due
> premesse è un token: chi mette `--text-on-accent: var(--blue-900)` — il «nero
> più morbido» — porta diversi accenti sotto la soglia senza che cambi
> nient'altro. Una verifica che oggi non può fallire e domani sì è una cosa
> diversa da un ramo che nessun parametro raggiunge, e la differenza è scritta
> accanto.

> **Trovato in revisione.** Dieci difetti, e il primo è di quelli che questa PR
> esiste per intercettare. Il riassunto della tendina si ricava con «la voce il
> cui `href` è quello corrente», e su una pagina che non sta in nessuna voce
> — la rassegna dei componenti — quello corrente è `undefined`: il confronto
> `item.href === undefined` è vero di **«Rassegna stampa»**, l'unica voce senza
> indirizzo. Il menu del telefono nominava lì una pagina che non esiste, su una
> pagina su cui il lettore non era, e il commento del componente prometteva
> «Menu». Niente falliva, e nessun test guardava quel ramo: ora ce n'è uno
> dentro l'`if` che già distingueva quel caso.
>
> **Lo spegnimento dei `pointer-events` era a metà.** L'involucro non basta,
> perché la pillola è a sua volta un riquadro fisso sopra lo scroller — e sul
> telefono è larga quanto lo schermo, cioè una fascia di 54 pixel in cima al
> programma dove il dito non scorre. La risposta è quella che la Timeline aveva
> già scritto: spegnerli anche sulla pillola e restituirli a ciò che si preme.
> La prova manuale di questa PR aveva guardato il punto giusto e concluso il
> contrario — «sopra la pillola no, che è come deve essere» — perché sulla
> pillola c'era una voce sotto il puntatore.
>
> **`checkInternalLinks` leggeva i corpi degli script come markup**, quando la
> guardia gemella nello stesso strato li annerisce da sempre e per la ragione
> scritta lì: Astro spedisce uno script verbatim, e una stringa che somiglia a un
> link avrebbe fatto segnalare `/rassegna` su ogni pagina del sito. Una guardia
> che scatta sul lavoro giusto è la metà che qualcuno spegne.
>
> Il resto: il bottone WhatsApp della pagina contatti apriva una scheda nuova
> senza dirlo, mentre la riga venti righe più su e tutte e tre le uscite di
> `Scene.astro` lo dicono; la lettura di `--text-on-accent` prendeva la prima
> dichiarazione e basta, quindi il giorno che il tema chiaro la ridichiara la
> verifica nuova misurerebbe in silenzio il nero dell'altro tema; le righe di
> contatto si sottolineavano al passaggio del mouse e non al fuoco, cioè per una
> tastiera erano l'unico link senza affordance delle due pagine; il messaggio di
> `checkAccentContrast` sceglieva la spiegazione con una soglia binaria, e a un
> terzo chiamante avrebbe detto «sotto il 3:1» di un colore che il 3:1 lo supera;
> e `Placeholder` portava una prop `as` che non passava nessuno.

### Test manuali

Fatti sul sito **costruito**, non in `npm run dev`:

- La tendina si apre e si chiude col tocco, mostra le quattro voci, marca quella
  corrente con l'accento e lascia «Rassegna stampa» spenta con il suo *in arrivo*
- **Con la tendina chiusa, i suoi link non prendono né il fuoco né i clic**:
  provato chiamando `focus()` e con un `elementFromPoint` sul punto dove il
  pannello sarebbe — il browser non li dà, che è ciò che rende `<details>` la
  scelta giusta invece di una scommessa
- Il clic fuori **non** chiude il menu: è il costo dichiarato di non avere uno
  script, ed è stato verificato che sia quello e non altro
- L'ordine di tabulazione è salta-a, marchio, tendina, voci
- La pillola non mangia lo scorrimento: nel vuoto fra due voci il colpo di
  rotella arriva alla scena sotto, mentre marchio, voci e riassunto restano
  premibili — provato con `elementFromPoint` prima e dopo la correzione della
  revisione
- L'accento della navigazione segue la serata a schermo: sul programma la
  pillola è verde come il ciclo 3, sulle due pagine è l'arancio predefinito
- L'indirizzo pubblicato è quello della collection, con la città
- I segnaposto si vedono che sono segnaposto: cornice tratteggiata, targhetta, e
  un lorem ipsum che nessuno può leggere come una frase dell'associazione
- **La riga di voci del desktop a larghezza vera**, con le due pagine e il
  programma: la riga entra nella pillola senza andare a capo, la voce corrente si
  legge, le sezioni a due colonne reggono, la pillola non copre il titolo di una
  serata e sopra il suo vuoto la rotella scorre il programma

> **Fatto dal committente, non qui.** La finestra del browser guidato da questa
> macchina non passa i 521px — `resize_window` risponde «fatto» e
> `window.innerWidth` non si muove, e le media query non rispondono allo zoom
> CSS — quindi la riga desktop era stata guardata forzando le due regole di
> `display` a quella larghezza: si vedeva che rende, non come respira a 1440. È
> il caso in cui l'emulazione non sostituisce lo schermo, come il telefono vero
> della PR 15: la prova è stata chiesta a chi ne aveva uno.

---

## PR 14 — Sveltia CMS

**Branch:** `cms-sveltia` · **Dipende da:** 3, 9

Fino a qui una serata si aggiunge scrivendo un file. Da qui si aggiunge da un
form, e chi la scrive non sa che esiste git.

Il pezzo grosso non è il form — quello lo disegna Sveltia — è **il confine fra
il form e lo schema**: due elenchi di campi che devono dire la stessa cosa e che
non hanno niente che li tenga insieme. Un campo che il CMS non offre non lo
compila nessuno; un campo che offre in più la build lo scarta in silenzio; un
campo obbligatorio in Zod e facoltativo nel form è una build rossa che il
redattore non sa leggere. È deriva che si scopre in produzione, perché in locale
i file li scrive una mano che lo schema ce l'ha sotto gli occhi.

E c'è una promessa già scritta da mantenere: [contenuti.md](contenuti.md) dice
«**Il CMS scrive lo scostamento da sé**» dalla PR 3. Non la teneva niente. Il
fuso è il quarto posto in cui la regola 11 si perde, e il primo in cui si
perderebbe **senza che nessuno scriva una riga di codice**: basta che il campo
data non dichiari il fuso, e a decidere l'ora pubblicata è dove si trovava chi
ha compilato il form.

### Decisioni prese scrivendo la PR

Le otto per esteso stanno in [decisioni.md](decisioni.md), sotto *Il CMS*. In
breve:

- **Il bundle di Sveltia lo serviamo noi, e non lo committiamo.** Non da un CDN,
  per la ragione dei caratteri — il sito non dipende da nessun altro — e per una
  in più: quel JavaScript ha i permessi di scrittura sul repository, quindi la
  versione la fissa il lockfile. Non committato, perché 1,9 MB di minificato per
  ogni aggiornamento resterebbero nella storia per sempre, che è la ragione già
  scritta per le foto. Lo copia la build, e un test confronta i byte pubblicati
  con quelli installati. `@sveltia/cms` passa quindi fra le `dependencies`
- **L'accesso in questa PR è con token personale**, e l'OAuth entra fra gli
  obiettivi della PR 15: ha bisogno di un'origine registrata su GitHub e di un
  relay, e l'origine non esiste finché il sito non è pubblicato
- **Il fuso si dichiara nel CMS** — `input_timezone: Europe/Rome`,
  `output_utc: false`, `format: YYYY-MM-DDTHH:mm:ssZ` — con la sua guardia
- **Niente campo corpo**: nessuna pagina rende il `body` di un'entry. Offrirlo
  sarebbe un campo che scrive testo che non compare da nessuna parte; non
  offrirlo lasciando i corpi nei file sarebbe un salvataggio che li cancella
  senza dirlo. Escono dai quattro file d'esempio che ne avevano uno
- **Il nome del file lo decide il numero**: `81.md`, non `081.md`. Sveltia non
  ha un filtro che imbottisce di zeri, e due convenzioni in una cartella sono
  due mani che cominciano a non capirsi
- **Le immagini si ridimensionano nel browser**, 1600px sul lato lungo e 800×800
  i ritratti, in webp: è il secondo dei due punti di controllo di `contenuti.md`
  e l'unico che vale a regime
- **Le etichette sono italiane, la scocca del CMS è inglese**: Sveltia ha
  diciassette traduzioni e nessuna italiana
- **I facoltativi vuoti non si scrivono** e **non c'è pannello di anteprima**:
  un `attendance: ''` fermerebbe la build, e un'anteprima che non somiglia al
  sito è una promessa che il sito non mantiene
- **Il `config.yml` si convalida contro lo schema JSON che Sveltia pubblica**:
  è l'unica cosa che vede un'opzione scritta male, perché ogni altra guardia
  legge le chiavi che scriviamo noi

### Obiettivi

- [x] `/admin` si apre, in sviluppo e sul costruito, con il bundle servito da
      noi e la versione fissata dal lockfile
- [x] Le quattro collection con **tutti** i campi dello schema, etichette e
      aiuti in italiano, obbligatori dove lo schema li vuole
- [x] Il campo data scrive lo scostamento italiano, sempre, indipendentemente da
      dove si trova chi compila
- [x] Le immagini si ridimensionano al caricamento, con i due tetti diversi per
      foto tema e ritratti
- [x] Un redattore crea una serata senza sapere che esiste git — con l'accesso
      col token come sola eccezione, dichiarata
- [x] CMS e schema non possono divergere: la parità è un test, non una
      rilettura
- [x] `npm test`, `npm run check` e `npm run test:mutate` verdi, con le otto
      guardie nuove dentro: **65 su 65**

### Test automatici

Guardie nuove, ognuna con il suo caso negativo. Le prime tre leggono **lo schema
Zod vero**, importato con un alias per `astro:content`, e non un elenco di nomi
scritto a mano: sarebbe una terza copia che deriva, cioè il difetto che questa
PR chiude.

- **`checkCmsFieldCoverage`** — ogni campo dello schema ha il suo campo nel CMS,
  e nessuno in più. Nelle due direzioni, perché falliscono in modi diversi, e
  dentro le liste: un `role` che manca dal form è invisibile quanto un `title`
- **`checkCmsRequiredParity`** — obbligatorio in Zod, obbligatorio nel form. Un
  campo con `.default()` è facoltativo, ed è giusto
- **`checkCmsFieldKinds`** — il widget corrisponde al tipo: un
  `reference('cicli')` è una relazione **verso `cicli`**, l'enum `format` ha
  esattamente le sue tre opzioni, un `image()` è un campo immagine. È la metà
  che un controllo sui soli nomi non vede — una data scritta come stringa è la
  regola 11 persa
- **`checkCmsDateTimezone`** — il campo data dichiara `Europe/Rome`, non
  converte in UTC e scrive un formato che porta l'offset
- **`checkCmsImageLimits`** — nessun campo immagine senza tetto, risolto come lo
  risolve Sveltia: la libreria del campo **sostituisce** quella globale invece di
  aggiungersi
- **`checkEntryFileNames`** — ogni file di contenuto si chiama come lo
  chiamerebbe il CMS, espandendo il modello di slug della sua collection con la
  funzione con cui Astro ricava gli id
- **`checkNoEntryBody`** — nessun file di contenuto porta un corpo che nessuna
  pagina rende
- **`checkCmsConfigAgainstSchema`** — il `config.yml` è configurazione che
  Sveltia accetta, convalidata contro lo schema JSON del pacchetto installato.
  È la sola che vede un'opzione **scritta male**: tutte le altre leggono le
  chiavi che scriviamo noi, quindi un `input_timzone` verrebbe controllato sotto
  il nome sbagliato e approvato, mentre il CMS torna al fuso del browser. Legge
  gli errori di ajv come vanno letti — una chiave sbagliata dentro un `anyOf` ne
  produce sessanta, e la metà sono falsi

Sullo strato `build`:

- `dist/admin/` esiste, l'`index.html` chiede di non essere indicizzato e carica
  il bundle **da questo sito e da nessun altro**
- Il bundle pubblicato è **byte per byte** quello installato, e la licenza MIT
  gli sta accanto: è il patto della favicon, applicato a un artefatto che in git
  non c'è
- Il `config.yml` pubblicato è identico a quello che leggono le guardie, si
  legge come YAML e porta le quattro collection

> **Trovato scrivendo, e sono tutti della stessa famiglia.** Tre guardie
> esistenti hanno cominciato a scattare su un lavoro giusto appena il bundle è
> comparso in `public/`: `checkEmailSource` ha trovato sei `mailto:` dentro il
> minificato, e `checkMachineDateText` due `GMT` — un CMS contiene tutt'e due
> perché è un CMS. La risposta non è restringere le guardie: è che quel file non
> è sorgente nostro, come `copiedFromPublic()` dice già del pubblicato. Ora c'è
> `isVendored`, e l'elenco lo importa dallo script che copia, non lo riscrive.
>
> Il terzo era più grosso: `astro check` muore per **esaurimento di memoria**.
>
> E la guardia nuova sullo schema ha trovato sé stessa: la chiave con cui conta
> gli errori di ajv era costruita in due posti, e i due erano diversi di un
> carattere invisibile. Il confronto non trovava mai niente, la guardia ripiegava
> in silenzio sul suo ramo generico e diceva la cosa sbagliata su un difetto
> vero. L'ha detto il caso negativo che pretende **una** violazione per un
> errore; adesso la chiave la costruisce una funzione sola, che è la stessa
> lezione di sempre — la forma scritta due volte è la forma che diverge.
> `allowJs` è acceso e `include` è `**/*`, quindi TypeScript analizza 1,9 MB di
> minificato — un comando che smette di funzionare per un file che nessuno qui
> ha scritto, e con un errore che non nomina il file. Escluso nel
> `tsconfig.json`, con il motivo accanto.

### Test manuali

Fatti qui, sul sito **costruito** (`npm run preview`):

- `/admin` si apre, il CMS parte e il `config.yml` si legge senza errori. La
  pagina d'ingresso offre **solo** l'accesso col token — nessun bottone OAuth
  che finirebbe da nessuna parte — e su localhost anche «Work with Local
  Repository», che è di Sveltia e vale solo lì
- Le quattro collection compaiono con i nomi e le descrizioni italiane, e la
  serata ha tutti e quattordici i campi con le loro etichette e i loro aiuti:
  gli obbligatori portano l'asterisco, i facoltativi no — occhiello, foto,
  presenze, interventi, annullata, nota
- **Sotto il campo data si legge `(+02:00) Rome`**: è Sveltia che dice di aver
  letto `input_timezone`, cioè la riga da cui dipende tutto il resto
- Il ciclo è una scelta fra i cicli esistenti e si legge «3 — Terra di nessuno»,
  il colore ha la casella e il campo da scrivere a mano, e l'elenco delle voci
  porta il riassunto che il `config.yml` gli dà
- Salvataggio di un ciclo: passa dalla convalida e compare nell'elenco

Questa parte è stata provata con il backend `test-repo` di Sveltia, che tiene
tutto in memoria: serve a vedere le maschere senza autenticarsi, e il
`config.yml` è tornato subito al backend vero.

**Restano al committente**, perché hanno bisogno di un token o della cartella
locale — e sono la stessa cosa della prova a 1440px della PR 13, chiesta a chi
ne aveva lo schermo:

- Accesso col token contro il repository vero e un salvataggio su un branch di
  prova: il commit compare. Che la build parta è della PR 15, dove il sito è
  collegato
- **Lettura del file scritto**: campi giusti, `date` con `+02:00`, nessun corpo,
  nome del file uguale al numero
- **Una serata invernale**, che è l'altra metà della prova sul fuso: `+01:00`, e
  la scena la pubblica alle 21
- Caricamento di una foto grande: arriva ridimensionata e in webp, e il file che
  finisce nel commit è quello ridimensionato

---

## PR 15 — Pubblicazione

**Branch:** `pubblicazione` · **Dipende da:** 14

### Obiettivi

- [ ] Progetto collegato a Cloudflare Pages, build a ogni commit
- [ ] Rebuild notturno alle 03:00 italiane
- [ ] `site` impostato in `astro.config.mjs` quando il dominio esiste, con
      sitemap e URL canonici — e `/admin` **fuori dalla sitemap**, come
      `/componenti`
- [ ] Misurato il numero di file per deployment con le foto vere, come deciso
      in `vincoli-tecnici.md`
- [ ] **L'accesso al CMS col bottone «Sign in with GitHub»**, rimandato dalla
      PR 14 perché ha bisogno di un'origine che allora non esisteva: applicazione
      OAuth su GitHub, relay che tiene il segreto — il Worker
      `sveltia-cms-auth`, che è di Sveltia — e in `public/admin/config.yml`
      `auth_methods: [oauth, token]` con il `base_url` accanto. È la riga che
      rende vero «un redattore senza sapere che esiste git» anche per chi non ha
      un token

### Test automatici

- Con `site` impostato, gli URL canonici e i meta Open Graph sono assoluti
- La sitemap elenca tutte le pagine delle serate

### Test manuali

- Un commit sul `main` pubblica entro pochi minuti
- Il rebuild notturno scatta e sposta davvero una serata da *in programma* a
  *già svolta*
- Anteprima di un link con il dominio vero
- **Le prove su telefono rimandate dalla PR 7 e dalla PR 8**, che adesso hanno
  un URL che apre chiunque: su iPhone lo snap non salta quando la barra di
  Safari si ritrae e l'apertura cade sulla prima serata futura; su Android lo
  stesso giro; e lo scorrimento morbido della Timeline arriva a destinazione
  senza essere interrotto dallo snap

---

## PR 16 — Proporzioni su schermo piccolo

**Branch:** `proporzioni-mobile` · **Dipende da:** 8, 13

Non è rifinitura rimandata per pigrizia: è **la stessa taratura fatta una volta
sola invece che tre**. Su un telefono la scena divide l'altezza con due cose che
alla PR 7 non esistevano ancora — la Timeline orizzontale in basso (PR 8) e la
navigazione a pillola in alto (PR 13) — e ogni misura decisa prima che ci siano
va rifatta quando arrivano.

Quello che alla PR 7 doveva essere giusto, ed è giusto, è la **struttura**:
niente contenuto che esce dallo schermo e nessuna scena scorrevole. Le
proporzioni fra le parti sono un'altra cosa e si guardano quando lo schermo è
pieno di tutto ciò che ci andrà.

Va fatta **su un telefono vero**, non in emulazione, insieme alle prove
rimandate in [questioni-aperte.md](questioni-aperte.md).

### Obiettivi

- [ ] **I `clamp()` tipografici hanno i limiti in `rem`, non in px.** È l'unico
      punto in cui oggi il sito viola davvero una buona pratica: `font-size:
      clamp(28px, min(4.6vw, 7.2vh), 72px)` non dipende in nessuno dei suoi tre
      termini dalla dimensione del carattere di base, quindi chi ingrandisce il
      testo dal browser o dal sistema non ottiene niente. I token `--text-*`
      sono già in `rem`; i px sono rientrati nelle scene, copiati dal design. Per
      un pubblico di cinquanta e sessant'anni è la differenza che conta più di
      tutte le altre
- [ ] L'immagine della serata ha una dimensione che si legge, con Timeline e
      navigazione a schermo — la sua forma inclinata è del marchio e non si
      toglie per far spazio
- [ ] L'ordine in cui la scena cede su schermo basso è ancora quello giusto ora
      che gli ingombri sono tutti presenti
- [ ] Il testo del titolo e della descrizione sono tarati sulle larghezze vere
      dei telefoni comuni, non su una scala scelta a tavolino
- [ ] Le tacche della Timeline e la pillola della navigazione non coprono niente
      di ciò che una scena deve mostrare
- [ ] **Il pannello del modale sta dentro lo schermo che c'è.** Oggi è
      `max-height: 80vh`, cioè misurato sul viewport grande: su iOS con la barra
      degli indirizzi visibile può essere più alto di quel che si vede, e il
      `max-height` del `<dialog>` non lo taglia perché `.modal` è `overflow:
      visible` — il fondo di un testo lungo finisce fuori senza una barra che ci
      porti. È la stessa questione `svh` contro `vh` delle scene, rimandata qui
      perché cambiare quel numero cambia le proporzioni del modale, e le
      proporzioni si guardano su un telefono vero

### Test automatici

- Le guardie esistenti continuano a passare: una scena non diventa scorrevole e
  la pagina resta un solo contenitore scorrevole
- Nessuna media query in sintassi range nel CSS pubblicato

### Test manuali

- Su un telefono vero, con tutte le serate: la scena si legge senza che niente
  esca dallo schermo, in verticale e in orizzontale
- **Con il testo del sistema ingrandito**, che è il controllo per cui esiste il
  primo obiettivo: portarlo al 200% e vedere che il sito cresce invece di
  restare fermo. È un pubblico di cinquanta e sessant'anni
