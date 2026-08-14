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

**Il numero di un passo è il numero della sua PR su GitHub**, e quindi ogni PR
entra nell'elenco — anche quella che tocca solo la documentazione. Un passo
saltato disallinea i due elenchi da lì in avanti, e da quel momento «la PR 12»
va chiesta invece che letta.

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
   è poco si riduce l'altezza, non si taglia la firma. `Brand` non offre una
   prop di forma — è il modo in cui la regola si viola, quindi non c'è — e la
   firma sta nel template e non in un valore predefinito, che è qualcosa per cui
   si può passare altro. Due guardie in `test/guards/brand.ts`: la prima legge
   il **testo dentro** ogni elemento `data-brand` pubblicato, non i suoi
   attributi, perché una firma messa in un `aria-label` sopra un marchio
   troncato è il difetto e non il rimedio; la seconda scatta sul sorgente il
   giorno che una prop di forma torna «solo per il piè di pagina».

8. **Niente del runtime di Claude Design va in produzione**: `<x-dc>`,
   `<sc-for>`, `<sc-if>`, `<x-import>`, `<image-slot>`, `DCLogic`,
   `support.js`. I file in `design-export/` sono la **specifica da tradurre**,
   non codice da riusare.

9. **I componenti del design system si scrivono in `.astro`, non come isole
   React.** Sono presentazionali; l'unico con stato si replica con `:active`.
   La decisione si perde in tre modi diversi e ha tre guardie in
   `test/guards/react.ts`: una dipendenza (Preact compreso — «sono solo 3KB» è
   la forma in cui torna), una direttiva `client:` che trasforma un componente
   in un'isola, e il runtime che compare in `dist/`. Solo la terza dice cosa
   scarica davvero un visitatore, ed è quella a cui nessuno penserebbe di
   guardare. **E i colori dei componenti vengono dai token**: un esadecimale
   scritto in un `.astro` è giusto il giorno che lo si scrive e sbagliato il
   giorno che il token che duplica viene ritarato — `checkRawColourValues`, che
   lascia passare `rgba(var(--token-rgb), 0.68)` perché è la forma prescritta
   dalla regola 3.

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
    `:root`, che è una pagina giusta del colore sbagliato. Tre guardie in
    `test/guards/cycles.ts`: la prima legge il sorgente — ogni foglio che la
    build spedisce, `public/` compreso, e segnala solo le regole che
    **dichiarano un accento**, perché `[data-cycle] { scroll-snap-align }` è
    lavoro legittimo — la seconda le pagine pubblicate, perché nel sorgente
    `data-cycle={n}` è un'espressione; la terza pretende che il colore di un
    ciclo si legga sul fondo, **almeno 3:1**, che è la sola metà numerica della
    taratura che le cinque regole cancellate garantivano per costruzione. Due
    cicli con lo stesso numero fermano la build: il numero è il nome del ciclo
    nel CSS. E il valore predefinito fuori da un ciclo sta in `:where(:root)`,
    a specificità zero: scritto `:root` pareggerebbe con le regole emesse e
    vincerebbe per ordine dei fogli il giorno che `data-cycle` finisce su
    `<html>`.

13. **Le forme di ritaglio non si scrivono a mano e non si copiano.** Le genera
    `src/lib/shapes.ts`, modulo puro come `events.ts` e `cycles.ts`, e le emette
    `ClipShapes.astro`. Cinque sono **ispirate a Material 3**, non le forme di
    Material: Google non pubblica né i path né i parametri, quindi la
    ricostruzione è nostra, con i parametri scritti accanto alla forma — e la
    documentazione dice *ispirate*, perché promettere una fedeltà che nessuno
    può verificare è la mezza verità che questo repository passa il tempo a
    cacciare. La quinta, `clip-skewed`, tiene la geometria dell'export: Material
    non ha un corrispondente. **Gli `id` sono l'interfaccia** e non cambiano: la
    geometria si ritara senza che se ne accorga nessuno di chi la referenzia.
    Una forma a lobi si costruisce con **cerchi raccordati**, non arrotondando i
    vertici di una stella: l'arco a un vertice non può essere più largo del
    vertice, quindi o le rientranze sono profonde o le punte sono tonde, mai
    tutt'e due. **E un `<clipPath>` senza geometria ha la sua guardia**: non
    viene ignorato, ritaglia *tutto* — pubblica un buco al posto della foto, con
    l'`id` che risolve e la suite verde.

14. **Una tacca della Timeline è un'ancora, non un bottone.** L'export scrive
    `<button onClick>`; `<a href="#serata-81">` è l'elemento per una cosa che
    porta a un punto del documento, e arriva con l'indirizzo condivisibile, il
    tasto indietro, l'apri-in-nuova-scheda, l'annuncio da screen reader e il
    salto che il browser fa da sé — nessuna delle quali è scritta qui. Costa
    **meno** del bottone: che funzioni senza script è quel che la scelta più
    economica regala, non la ragione per cui è stata fatta. Un bottone rende una
    rotaia identica a schermo che non fa niente finché qualcuno non gli scrive
    tutto, ed è il modo in cui questa decisione si perde in silenzio. Due
    guardie in `test/guards/timeline.ts`: la tacca è un `<a href>` — e un `<a>`
    senza indirizzo non lo è — e il suo frammento trova un `id` che esiste
    davvero nella pagina, non uno che gli somiglia e non uno chiuso in un
    `<template>`, dove `getElementById` non arriva. **E la tacca porta la
    distanza dalla corrente, non un rango**: è ciò che permette al solo CSS di
    dare due trattamenti diversi alle tacche vicine e a quelle lontane, senza un
    secondo numero in uno script — che sarebbe un markup sbagliato per chi non
    lo esegue. **E ogni serata ha la sua tacca visibile**: le lontane sono
    marchi senza data sul desktop, e sul telefono la barra scorre. Nasconderle
    faceva una rotaia che non raggiunge l'archivio — undici tacche su ottantuno,
    con la dodicesima a settanta schermate di distanza — ed è il difetto che ha
    trovato il committente guardando la barra su un telefono, non un test. **E l'accento sta sul segno, mai
    sulla data**: quello che i cicli garantiscono è 3:1, la soglia di un bordo,
    e una parola ne vuole 4,5 — è la decisione che `Modal.astro` aveva già
    scritto per il link dentro il pannello.

15. **Lo scroller non anima i salti, e se l'animazione tornasse tornerebbe come
    proprietà — mai come argomento.** `scroll-behavior` raggiunge solo gli
    scorrimenti che chiede uno script, e qui sono tutti salti a una serata: un
    salto animato è interrompibile, e un secondo salto partito mentre il primo è
    in volo il motore lo lascia cadere. La pagina resta sulla prima destinazione
    mentre rotaia, accento e indirizzo dicono la seconda — due tacche toccate a
    due decimi di distanza bastano, e quello che resta è un sito che si
    contraddice senza niente da vedere. La PR 8 l'aveva spedito e aveva
    archiviato il sintomo come una misura sbagliata; la PR 9 l'ha riprodotto e
    tolto la proprietà. Adesso i salti atterrano subito, il che risponde anche a
    `prefers-reduced-motion` per costruzione invece che con una regola che deve
    continuare a vincere. **`checkSmoothScrollArgument` in
    `test/guards/scroller.ts` resta e conta di più**: un `{ behavior: 'smooth' }`
    passato a mano rimetterebbe l'animazione dove nessun foglio di stile la
    raggiunge, e ogni salto fatto da script continua a chiamare
    `scrollIntoView()` **senza argomenti**. La guardia legge il sorgente e lascia
    stare il foglio di stile: a distinguerli sono le virgolette.

16. **L'indirizzo segue la serata a schermo, e si sostituisce — non si
    impila.** Ogni serata è una rotta e le tacche restano frammenti, perché
    puntarle a `/N` farebbe scaricare duecento kilobyte di documento per fare il
    lavoro di uno scorrimento. A tenere allineato l'indirizzo è
    `history.replaceState` dentro l'osservatore. Con `pushState` sarebbe una
    voce di cronologia per ogni serata attraversata, e il tasto indietro
    smetterebbe di uscire dal sito per mettersi a risalire l'archivio: è la
    differenza di una parola e non si vede in nessun modo.
    `checkHistoryPush` in `test/guards/routes.ts`. **E si aggiorna al cambio,
    non all'apertura**: riscrivere `/` in `/81` appena la pagina si apre
    consegnerebbe a chi mette un segnalibro sulla radice un indirizzo che
    invecchia. `/` è l'unico che non invecchia. **E ogni numero pubblicato deve
    avere la sua rotta** — `checkEveningRoutes`, sul pubblicato: un numero senza
    pagina è un 404 che compare solo quando qualcuno ricarica o condivide.

17. **Il numero della prenotazione si scrive in un posto solo, e il segnaposto
    del design non si pubblica mai.** Non c'è un backend: tenere un posto è un
    link a WhatsApp, quindi quel numero è configurazione e sta in
    `src/lib/contact.ts`, modulo puro che costruisce anche i link. Una seconda
    copia scritta a mano non è sbagliata il giorno che la si scrive — è giusta,
    ed è per questo che la si scrive — è sbagliata il giorno che il numero
    cambia e ne segue una sola: fra i due momenti non fallisce niente, perché un
    `wa.me` ben formato che apre una chat con uno sconosciuto è una pagina
    perfetta. **E il modulo rifiuta un numero che non riconosce invece di
    scriverlo**, come il generatore dei cicli con un colore che non è un
    esadecimale: senza prefisso internazionale il link è valido e raggiunge
    un'altra persona. Due guardie in `test/guards/contact.ts`: la prima legge il
    sorgente — nessun indirizzo WhatsApp e nessuna di quelle cifre fuori dal
    modulo, con i commenti che non contano, perché una guardia che segnala la
    prosa che la spiega è una guardia che qualcuno spegne — la seconda cerca in
    `dist/` il segnaposto `+39 300 000 0000`, che è ancora scritto in
    `design-export/`: quella cartella è la specifica da cui si traduce, quindi il
    modo in cui quel numero arriva in produzione è qualcuno che ne copia la riga.
    Tutt'e due leggono i numeri **come li scrive una persona**, perché
    `393000000000` e `+39 300 000 0000` sono lo stesso numero — e si rifiutano di
    chiamare numero una sequenza a gruppi di una cifra, che è come sono scritte
    le coordinate di un path SVG.

18. **La navigazione è fatta di link, e la voce che non ha una pagina non è un
    link.** Sta in `Base.astro` con `CycleAccents` e `ClipShapes`, per lo stesso
    criterio: dimenticarla non fa fallire niente, pubblica una pagina che si
    legge benissimo e da cui non si esce. Le voci sono `<a href>` e non i
    `<button onClick>` dell'export — è la regola 14 sulla seconda rotaia del
    sito — l'indicatore scorrevole del design è `aria-current="page"`, e la
    tendina del telefono è `<details>/<summary>`, che si apre senza script.
    **«Rassegna stampa» è testo**: un `<a>` senza indirizzo ha il ruolo generico
    e non l'annuncio di un link, e in un menu è una voce che sembra attiva e non
    lo è. Due guardie: `checkAnchorsWithoutHref` — con la sola eccezione scritta
    *e verificata*, il link disabilitato di `Button`, che porta `role="link"` **e**
    `aria-disabled="true"`, perché metà di quella coppia non annuncia niente — e
    `checkInternalLinks`, che pretende che ogni indirizzo interno pubblicato
    trovi la sua pagina in `dist/`: è ciò che tiene quella voce a essere testo,
    senza doverlo ridire. L'elenco è reso due volte, riga e tendina, da
    `NAVIGATION`: è impaginazione, una delle due è sempre `display: none`, e le
    marcature pubblicate sono quindi due.

19. **L'indirizzo della sede si compone in un posto solo**, `src/lib/venues.ts`,
    modulo puro come `contact.ts`. La collection teneva l'indirizzo da sempre;
    quello che si scriveva a mano era la *scrittura*, e ce n'erano già due che
    non concordavano. `fullAddress()` rifiuta una sede con un campo vuoto invece
    di pubblicare una virgola sospesa. **E gli indirizzi del design non
    compaiono da nessuna parte**: `checkStaleVenue` legge il sorgente e `dist/`,
    e l'elenco sta accanto a quello buono, in `venues.ts`, come
    `PLACEHOLDER_NUMBER` sta accanto al numero.

20. **Un segnaposto si dichiara, sta in un posto solo, e non sopravvive al
    dominio.** I testi che l'associazione non ha ancora scritto sono lorem ipsum,
    `Nome Cognome` e cifre a `0000`: un segnaposto credibile — quattro persone
    con nome e cognome, «1.400 persone in sala» — è una pagina che rende
    perfettamente, dice il falso e non fallisce da nessuna parte. Stanno tutti in
    `src/lib/placeholder.ts`, e ogni blocco che ne porta uno si scrive con il
    componente `Placeholder`, che mette insieme la cornice che il lettore vede e
    il `data-placeholder` che la guardia legge — separati, quello che si dimentica
    è sempre l'invisibile. Tre guardie in `test/guards/placeholder.ts`:
    `checkPlaceholderText` sul pubblicato, `checkPlaceholderSource` sul sorgente,
    e `checkNoPlaceholders`, che **con `site` impostato in `astro.config.mjs`
    rende una violazione un solo blocco marcato**. È l'interruttore di `og:url`:
    la PR 15 non chiude finché i testi veri non ci sono, ed è voluto.

21. **Il CMS e lo schema sono lo stesso elenco visto da due parti.**
    `public/admin/config.yml` e `src/content.config.ts` descrivono gli stessi
    campi a due lettori diversi, e niente nei due file li tiene d'accordo. Le
    tre forme in cui divergono sono tutte silenziose: un campo che il form non
    offre non lo compila nessuno, un campo che il form ha in più viene scritto
    nel file e **buttato via alla build senza una parola**, e un campo
    obbligatorio in Zod e facoltativo nel form è una build rossa su una serata
    che il redattore ha già salvato. La parità non si rilegge: `test/guards/cms.ts`
    carica lo schema Zod vero — `src/content.config.ts` importato con un alias per
    `astro:content` — e confronta nomi, `required`, widget, bersaglio delle
    relazioni e opzioni degli enum. Un elenco di nomi scritto in un test sarebbe
    la terza copia di ciò che le guardie tengono insieme. **E la regola 11 vale
    anche lì**: il campo data dichiara `input_timezone: Europe/Rome` — senza, il
    fuso è quello del browser di chi compila, ed è l'unico posto in cui questa
    regola si perde senza che nessuno scriva una riga di codice. **Ogni campo
    immagine ha un tetto** prima del commit, perché git non dimentica una foto da
    4 MB. **Il nome di un file di contenuto lo decide il modello di slug del
    CMS** — `81.md`, non `081.md` — perché da qui in poi le mani che scrivono in
    `src/content/` sono due e una sola legge il `config.yml`. **E un file di
    contenuto non porta un corpo**: nessuna pagina lo rende, quindi il CMS non
    offre il campo, e la prosa scritta lì sarebbe cancellata al primo
    salvataggio. **E il `config.yml` si convalida contro lo schema JSON che
    Sveltia pubblica**, `checkCmsConfigAgainstSchema`: tutte le altre guardie
    leggono le chiavi che scriviamo noi, quindi un `input_timzone` scritto male
    verrebbe controllato sotto il nome sbagliato e approvato, mentre il CMS
    torna al fuso del browser. La terza parte dell'accordo è Sveltia, e l'unica
    cosa che parla per lei è il suo schema.

22. **Il bundle del CMS lo serviamo noi, e non sta in git.** Non da un CDN — la
    ragione dei caratteri, più una che vale solo qui: quel JavaScript ha i
    permessi di scrittura sul repository, quindi quali byte siano lo decide
    `package-lock.json`. Non committato, perché 1,9 MB di minificato per ogni
    aggiornamento resterebbero nella storia per sempre, che è il motivo scritto
    in `docs/contenuti.md` per le foto. Lo copia `npm run cms:sync`, che gira
    dentro `dev` e `build`, e un test dello strato `build` confronta i byte
    pubblicati con quelli installati — è il patto della favicon, applicato a un
    artefatto che in git non c'è. Perciò **`@sveltia/cms` sta fra le
    `dependencies`**: la build ne ha bisogno davvero. Ed è **escluso dal
    `tsconfig.json`**, perché con `allowJs` acceso `astro check` lo analizza e
    muore per esaurimento di memoria. Quel bundle non è sorgente nostro: le
    guardie sul sorgente lo saltano — `isVendored` in `test/support/paths.ts` —
    come quelle sul pubblicato saltano ciò che arriva da `public/`. Contiene
    `mailto:` e `GMT` perché è un CMS, e una guardia che scatta su un lavoro
    giusto è la metà che qualcuno spegne.

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
public/admin/      il CMS: index.html e config.yml; il bundle lo copia la build
scripts/           utilità (caratteri, favicon, bundle del CMS)
src/assets/fonts/  woff2 self-hostati e licenze OFL
src/components/    i componenti .astro
src/layouts/       Base.astro: il documento che ogni pagina abita
src/content/       eventi, cicli, sedi, relatori
src/content.config.ts   schema Zod delle quattro collection
src/lib/           il dominio: events.ts, cycles.ts, shapes.ts, contact.ts,
                   venues.ts, navigation.ts e placeholder.ts puri,
                   programme.ts legge le collection
src/styles/tokens/ i token del design
src/styles/global.css   strato base del documento
test/guards/       le guardie ai vincoli, come funzioni pure
test/unit/         i loro test, positivi e negativi
test/build/        le asserzioni su ciò che finisce in dist/
```

**Lo scroller del programma è `src/components/Programme.astro`, e le rotte che
lo usano sono due**: `src/pages/index.astro`, che si apre sulla prima serata
futura, e `src/pages/[number].astro`, che si apre su quella del suo numero e ne
porta i meta. `/81` non è una pagina diversa dal programma — è il programma
aperto sull'ottantunesima, ed è per questo che quell'indirizzo esiste: un link
incollato in chat mostra titolo e figura per i meta Open Graph di quella rotta.
Copiare lo scroller nella seconda pagina sarebbe due sorgenti per una schermata
sola.

Ogni scena porta quattro attributi che non sono decorazione: `data-number` nomina
la serata, `data-state` dice da che parte di oggi cade, `data-open` marca quella
su cui il programma si apre — è ciò su cui salta lo script — e `data-cycle`
decide l'accento. I primi tre sono quelli che
`test/build/published-dates.test.ts` legge in `dist/` per provare che una build
in UTC pubblica le ore italiane: **se rifai la scena, riportali**. `data-label`
porta la data breve che la Timeline mette sulle tacche.

Dalla PR 8 la pagina porta anche **la Timeline** — la rotaia verticale a destra,
la barra in basso sul telefono — e con essa `data-cycle` su `<html>`, che è
l'accento di tutto ciò che non sta dentro una scena. Lo sposta l'osservatore che
segue lo scorrimento, ed è **uno solo**: quale serata è a schermo è la stessa
domanda dietro `aria-current`, dietro l'accento e dietro la finestra di tacche.
Il valore di partenza lo scrive la build, ed è quello della serata di apertura:
in `dist/` non gira nessuno script, e una rotaia che aspettasse il suo
arriverebbe senza niente marcato.

`data-cycle` è l'unico che ha bisogno di compagnia: le regole dell'accento gliele
dà `Base.astro`, che dalla PR 5 include `CycleAccents` e `ClipShapes` per ogni
pagina. **Una pagina non si scrive più `<html>` e `<head>` da sé**: le scrive il
layout, e ciò che il layout porta — lingua, meta, salta-a, accenti, forme — è
guardato pagina per pagina in `test/build/published-pages.test.ts`.

**Il modale è uno solo per pagina, e si riempie clonando ciò che è già nel
markup.** I link agli interventi di una serata sono `<a href>` veri dentro la
scena: il CSS li nasconde solo dopo che lo script è partito — è la classe
`no-js` sul documento, tolta dal primo script della testa — così con gli script
spenti non si perde niente. **Non spostarli in un `<template>`**: lì sarebbero
invisibili a chi non ha script, a un crawler e a Ctrl+F, e una guardia lo dice.
Quattro guardie in `test/guards/modal.ts`: il bersaglio di ogni bottone esiste
nella pagina, di `<dialog>` ce n'è uno, i link stanno fuori dai template, e
l'interruttore fra le due forme di un controllo nasconde davvero — qui sotto.

**La prenotazione è l'altra cosa che apre quel modale, e ne ha una per serata.**
Il pannello sta in un `<template>` dentro la scena — lì va bene, perché quel
testo non ha un posto nella pagina finché non lo si chiede — e uno per serata
perché contiene il link, che nomina la serata nel messaggio che manda. Un
template unico potrebbe portare solo un link che non ne nomina nessuna, e farlo
riscrivere allo script sarebbe il modale che costruisce contenuto dai dati
invece di clonarlo. **Il bottone porta due forme**, `only-js` e `no-js-only`,
come il bottone e la lista dei materiali: senza script «Prenota il posto» è
direttamente il link, e quel che si perde è la spiegazione, non l'azione.

**E l'interruttore fra le due forme si dichiara `!important`.** Non è stile: è
«per questo lettore quell'elemento non esiste», e deve battere qualunque
`display` dichiari un componente. `.no-js .only-js` sono due classi, quante ne
pesa il `.button[data-astro-cid-…]` in cui si compila uno stile di componente —
un pareggio, deciso dall'ordine dei fogli, e deciso male: dalla PR 7 alla PR 12
un bottone morto si è pubblicato sopra la lista che avrebbe dovuto sostituire.
`checkNoJsSwitch` lo rilegge in `dist/`, che è dove il difetto stava: nel
sorgente le due metà sono simmetriche.

**Lo scroller è un solo contenitore scorrevole.** L'export rende scorrevole anche
ogni scena, e non si copia: con due contenitori annidati né una tastiera né uno
screen reader sanno a chi parlano le frecce. Il testo lungo si ritaglia, non si
scorre — `checkSingleScroller` in `test/guards/scroller.ts` conta i contenitori
scorrevoli della pagina e ne pretende uno. L'unica eccezione è ciò che sta
dentro un `<dialog>` — mentre è aperto il resto è inerte — e **la barra della
Timeline sul telefono**, che è fissa, sta fuori dal programma e scorre
sull'altro asse, quindi non prende nessun gesto che lo scroller volesse. Tutt'e
due **vanno scritte nel selettore** — `dialog.modal .modal-panel`,
`.timeline[data-timeline]` — perché dal CSS non si vede né che un
`.modal-panel` sta dentro un modale né che una striscia è una barra
orizzontale. E la seconda la guardia **la verifica sull'asse** invece di
crederle sul nome: `[data-timeline] { overflow-y: auto }` sarebbe un secondo
scroller verticale con l'etichetta giusta.

**I target di build sono la soglia dei browser.** Stanno in `astro.config.mjs` e
non sono un dettaglio di configurazione: senza, il minificatore riscrive
`@media (max-width: 900px)` nella sintassi range, che è Safari 16.4 contro la
soglia dichiarata di 15.4 — e su iOS 15.4–16.3 ogni media query dello scroller
smette di applicarsi, con il telefono che riceve il layout desktop e il sorgente
che ha ragione. `checkMediaRangeSyntax` legge il CSS pubblicato.

**Le due pagine istituzionali sono `src/pages/chi-siamo.astro` e
`src/pages/contatti.astro`**, e sono fatte di prosa: il loro guscio — colonne,
sezioni, cifre, righe di contatto — sta in `src/styles/pages.css` e non nel
layout, perché in Astro il markup scritto in una pagina e passato a un layout
tiene lo scope della pagina, quindi le regole dichiarate nel layout non lo
raggiungerebbero. Non in `global.css`, che è lo strato del documento e lo paga
ogni pagina: lo scroller non ha niente da farsene.

`src/pages/componenti.astro` è invece **una pagina che resta**: la rassegna
degli otto componenti, con tutte le loro varianti. È pubblicata e `noindex`, e
la ragione per cui è pubblicata è la stessa per cui esiste lo strato `build` —
per lo stile il sorgente non basta, quindi una rassegna viva solo in `npm run
dev` lascerebbe le varianti di ogni componente verificate da nessuna parte.
Prende i dati veri dal dominio: un `data-cycle` inventato lì farebbe scattare la
guardia della PR 4. **Alla PR 15 va tenuta fuori dalla sitemap.**

## Comandi

Serve **Node 24** — la versione è fissata in `.nvmrc`, e `engine-strict` fa
fallire l'installazione con una versione diversa invece di riscrivere di
nascosto il `package-lock.json`.

```bash
npm run dev          # sviluppo
npm run build        # build statica in dist/
npm run preview      # anteprima della build
npm test             # guardie e test, con una build dentro
npm run test:mutate  # acceca ogni guardia a turno e pretende che la suite se
                     # ne accorga — sei o sette minuti, la gira la CI: è la
                     # suite intera una volta per guardia, e le guardie sono 65
npm run check        # astro check, typecheck
npm run fonts:sync   # ricopia i caratteri dai pacchetti @fontsource
npm run favicon:build  # rigenera public/favicon.ico da public/favicon.svg —
                       # lo fa già `npm run build`, e un test lo pretende
npm run cms:sync     # ricopia il bundle di Sveltia in public/admin/ — lo fanno
                     # già `npm run dev` e `npm run build`, e un test lo pretende
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

A tenere in piedi quella regola c'è `npm run test:mutate`, che la CI esegue a
ogni PR: acceca ogni guardia a turno — le fa restituire «nessuna violazione»
qualunque cosa le si dia — e pretende che la suite se ne accorga. Se una
guardia si può accecare senza che niente diventi rosso, i suoi test non la
stanno tenendo. **Cercare il nome di una guardia dentro i test non risponde
alla stessa domanda**: conta come i test sono scritti, non cosa tengono, e una
guardia chiamata da una helper locale non compare in nessuno degli `it()` che
la coprono.
