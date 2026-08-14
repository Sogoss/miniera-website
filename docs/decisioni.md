# Registro delle decisioni

Ogni riga è una decisione presa e il motivo per cui è stata presa. Serve a non
ridiscutere le stesse cose fra sei mesi, e a riconoscere quando una decisione
va riaperta perché il motivo che la reggeva non vale più.

Salvo indicazione diversa le decisioni sono del **10 agosto 2026**.

## Architettura

**Astro statico su Cloudflare Pages, contenuti in git, Sveltia come CMS.**
Nessun backend nel percorso critico. L'alternativa con Strapi e PostgreSQL su
k3d self-hosted costava circa il doppio in ore e aggiungeva una dipendenza
permanente dall'uptime di un server domestico. *(6 agosto 2026)*

**Pages e non Workers.** Cloudflare indirizza i progetti nuovi verso Workers
con static assets, ma Pages resta pienamente supportato e per un sito statico
pubblicato con git push è più semplice. Migrabile se un domani servisse logica
dinamica.

**Repository privato.** `github.com/Sogoss/miniera-website`.

**Rebuild a ogni commit più cron notturno alle 03:00.** Un sito statico non sa
che ora è: "già svolto" e la posizione di apertura dello scroller si calcolano
alla build.

## Stile

**Niente Tailwind.** Il design system è già un sistema di token in CSS puro, e
gli aggiornamenti futuri arriveranno nella stessa forma. Tailwind sarebbe uno
strato di traduzione da mantenere per sempre fra due vocabolari che dicono la
stessa cosa. Criterio dichiarato dal committente interno: *"perdiamo qualcosa
ora, ma evitiamo il debito tecnico"* — e qui il debito era Tailwind.

**Via `color-mix()` e `oklch()` dai token.** `color-mix` applicava quasi
sempre solo un canale alpha, che `rgba()` fa uguale; `oklch` serviva solo ai
colori dei cicli, che ora arrivano dal CMS. Il guadagno non è la data di
supporto ma la natura del degrado: da *sito illeggibile* a *sito che peggiora
un po'*.

**Caratteri self-hostati.** Prestazioni, e nessun dato dei visitatori verso il
CDN di Google. Tutti e tre SIL OFL 1.1, verificato.

**`svh` invece di `dvh`.** Con `dvh` la ritrazione della barra di Safari fa
saltare le posizioni di snap.

**I ripieghi si dichiarano in `@supports`, mai come doppia dichiarazione.** Il
minificatore collassa la doppia dichiarazione e il ripiego non arriva mai in
produzione.

## Design

**Il formato a scroll-snap è un requisito del committente.** Non
rinegoziabile. I suoi problemi si risolvono dentro il vincolo.

**Un solo sito responsive**, non due implementazioni. I due file di design
erano stati studiati separatamente ma hanno quasi tutto in comune.

**Le viste diventano pagine vere** con URL, back button e link condivisibili.

**Ogni serata ha il suo URL**, il numero editoriale nudo: `/81`. Niente slug —
le anteprime social vengono dai meta Open Graph, non dall'URL.

**Timeline verticale a destra su desktop, orizzontale in basso su mobile.**
Il divisore "oggi" si elimina.

**Il modale di prenotazione resta su entrambi**, perché contiene informazione
che altrimenti si perderebbe su mobile.

**Testo allineato a sinistra**, intestazione della serata come nel design
desktop.

**L'accento cambia a ogni serata**, anche ora che i cicli possono essere
concorrenti e quindi il colore cambia più spesso.

**Gli otto componenti si portano a `.astro`, niente isole React.** Sono
presentazionali, uno solo ha stato e quello si replica con `:active`.

**Titoli delle serate in `<h2>` nello scroller**, con un `<h1>` di pagina.

**`prefers-reduced-motion` azzera anche snap e scorrimento morbido**, che
l'export lasciava attivi.

## Contenuti

**Tutto tipizzato.** Nei file di design la data era testo libero senza anno,
le presenze una stringa. Non si replica.

**Cicli, sedi e relatori sono collection separate**, perché i loro valori si
ripetono fra gli eventi.

**Il numero editoriale è l'URL, si assegna alla programmazione e non si
riassegna mai.** Una serata annullata conserva numero e pagina, per non
rompere i link già condivisi.

**"Già svolta" dalla mezzanotte del giorno dopo**, non dall'ora di inizio.

**I cicli sono etichette, non periodi.** Possono essere concorrenti, non hanno
date.

**Il ruolo di un relatore sta sulla persona, sovrascrivibile per singolo
evento**, perché un ruolo cambia nel tempo.

**Il campo interventi è generico**, non specifico per YouTube.

**Il concetto di "solo audio" è eliminato.** Nel design era un bottone senza
URL: quell'audio non esiste.

**Compressione delle immagini a monte**, prima del commit e nel CMS. Git non
dimentica: una foto da 4 MB committata una volta resta nella storia per
sempre. Originali non compressi fuori dal repository.

## Logica di dominio

*(11 agosto 2026, PR 3)*

**La verità cronologica è `number`.** Il sito ordina per numero editoriale, non
per data: il numero è l'identità della serata, è il suo URL, e l'associazione
lo assegna alla programmazione. La data è il dato da cui si calcola tutto il
resto — passato, futuro, stringhe — ma quando i due ordini si contraddicono chi
ha sbagliato è la data.

**Un controllo alla build fallisce se i due ordini divergono**, e nomina le due
serate. Non deve succedere: la numerazione segue il calendario. Se un giorno
dovesse succedere davvero — una serata riemersa a cui si dà un numero in coda —
si deciderà allora come rappresentarla, verosimilmente con un suffisso, e il
controllo si allenta lì. Fino a quel giorno è un anno battuto male in un
frontmatter. Lo stesso controllo intercetta due serate con lo stesso numero:
finché non esistono le rotte della PR 9, nessun altro se ne accorge.

**Il confine fra passato e futuro si calcola confrontando date civili**, non
facendo aritmetica sugli offset. `romeDay()` porta un istante nella sua data a
Torino — `2026-09-24` — e `isPast` confronta due di quelle stringhe. Non c'è un
`+2` scritto da nessuna parte, e per questo le due notti del cambio d'ora non
sono un caso particolare: sono quattro asserzioni che passano da sole.

**La nota di una serata passata è sempre *Puntata registrata in sala*,** anche
senza materiali collegati: la registrazione esiste, i link possono arrivare
dopo. Quello che manca senza link è il bottone, non la frase.

**Una serata annullata ha come nota predefinita *Serata annullata*.** Serve
alla PR 9, che deve mostrarne lo stato. Il campo `note` sovrascrive comunque
tutto.

**Lo scroller si apre sulla prossima serata che si svolgerà davvero:** la prima
non ancora passata **e non annullata**. Un annullamento non è un appuntamento,
e aprire su una scena barrata sarebbe la prima cosa che si vede entrando nel
sito. Con tutte le serate alle spalle si apre sull'ultima, che è la più
recente: un indice `-1` diventerebbe una scena vuota.

**Le date portano l'anno, tutte** — `24 set 26`, `gio 24 set 26, ore 21`. Nel
design non c'era perché il design mostrava sei serate dentro una stagione sola,
dove *18 giugno* identifica qualcosa; su ottantuno non identifica niente.

**E lo portano a due cifre, in tutte e due le forme.** La rotaia della Timeline
è stretta e `24 set 2026` se ne prendeva un terzo in più; *giovedì 24 settembre
2026* era una riga e mezza di un'intestazione il cui lavoro è il titolo. Sono
la stessa data in due misure — la tacca, e la tacca con davanti il giorno della
settimana e dietro l'ora — invece di due modi diversi di scrivere una data
dentro lo stesso sito. Forma chiesta dal committente e guardata a schermo nel
controllo manuale della PR 3. *(PR 3, in revisione)*

**Il dominio è diviso in due file, e il puro non importa niente.**
`src/lib/events.ts` descrive strutturalmente le forme che gli servono invece di
importare i tipi di `astro:content`, e riceve `now` come argomento;
`src/lib/programme.ts` è l'unico che legge le collection e l'orologio. Non è
tidiness: è ciò che permette di eseguire il modulo con `node
src/lib/events.ts`, che è come la suite prova che sotto `TZ=UTC` e sotto
`TZ=Europe/Rome` le risposte coincidono. Un solo import di `astro:content`, e
quella prova non si potrebbe più fare.

**Un riferimento che non risolve ferma la build**, invece di viaggiare come
`undefined` dentro il markup. Lì diventerebbe un nome di ciclo mancante e un
accento fermo sul predefinito, senza un errore da nessuna parte.

**Il controllo d'ordine confronta giorni civili, non istanti.** Due serate
possono cadere lo stesso giorno — una proiezione il pomeriggio e un incontro
alle nove — e quale delle due porti il numero più basso è una scelta
dell'associazione, non una contraddizione. Confrontando istanti la build
falliva su quella coppia con una frase che nominava la stessa data da tutte e
due le parti, cioè illeggibile per chi doveva ripararla, e non c'era niente da
riparare: il sito ordina per numero, e tutto il resto del dominio ragiona in
giorni. Una vera inversione a cavallo di due giorni resta segnalata.
*(PR 3, in revisione)*

**Un numero doppio toglie dal controllo d'ordine entrambe le serate, non solo
la seconda.** Tenere la prima voleva dire tenere quella che il loader aveva
consegnato per prima — i file si leggono in ordine di nome — così un `080b.md`
che reclamava il numero 81 restava dentro con la sua data del 2020 e faceva
sembrare fuori posto la serata *giusta* che lo precedeva: due messaggi, il
secondo falso, e l'editor mandato a controllare una data che stava bene.
Finché un numero appartiene a due serate non c'è niente di vero da dire su
dove sta: il doppione è la cosa da correggere, ed è già stata detta una volta.
*(PR 3, in revisione)*

**Lo stato di una serata è una funzione pura del dominio, non un ternario nel
markup.** `stateOf` sta in `events.ts` accanto a `noteOf`, e mette
`cancelled` prima di `past`: una serata annullata non è né passata né futura, e
la pagina che chiedeva `past ? … : …` la pubblicava come una delle due con
sotto la nota che diceva che era stata annullata. Nessuna serata d'esempio è
annullata, quindi quel ramo in `dist/` non si vede: è proprio per questo che è
una funzione con il suo test invece che una riga dentro una pagina. L'attributo
`data-state` lo pubblica lo scroller della PR 7 su ogni scena, e la barratura la
aggancia lì la PR 9 — nella scena come nella pagina della serata — perché tutti
devono fare la stessa domanda. *(PR 3, in revisione; la barratura spostata alla
PR 9 in revisione alla PR 7)*

**L'orologio si legge una volta per build, non una per chiamata.** Stava nel
valore predefinito del parametro — `loadProgramme(now = new Date())` — che si
valuta a ogni chiamata: `loadProgramme()` lo si chiama una volta per pagina, e
le pagine di una build si generano nell'arco di qualche secondo. Una build
partita alle 23:59:59 avrebbe classificato la stessa serata come *in programma*
in home e come *già svolta* sulla sua pagina un secondo dopo, pubblicando un
sito che si contraddice senza che niente fallisca. Ora la lettura sta a livello
di modulo, che si carica una volta per processo. In `astro dev` significa che il
giorno è quello dell'avvio del server: un server lasciato acceso oltre la
mezzanotte mostra un'etichetta vecchia finché non riparte, e non pubblica
niente. *(PR 3, in revisione)*

## Accento dai cicli

*(12 agosto 2026, PR 4)*

**La collection è l'unica sorgente delle regole `[data-cycle]`.** Erano cinque
blocchi scritti a mano in `colors.css` che puntavano a cinque token, e il campo
`color` dei cicli non lo leggeva nessuno: due metà che non si toccavano, così
un colore cambiato in un file arrivava da nessuna parte e non falliva niente.
Ora le regole le emette `src/lib/cycles.ts` alla build, da ogni ciclo presente
nella collection. Tenere anche quelle scritte a mano come ripiego voleva dire
due dichiarazioni della stessa proprietà alla stessa specificità, decise
dall'ordine dei fogli: giusto oggi, sbagliato il giorno che un import si
sposta o che l'inlining di Astro scatta — e sbagliato in silenzio, che è la
forma di guasto che questo repository si è dato l'impianto per intercettare. La
regola 12 del `CLAUDE.md` e una guardia sul sorgente lo tengono così.

**I cinque colori restano dichiarati, e non li legge più nessuno.** Sono la
palette su cui il design è stato tarato — stessa luminosità e saturazione, tinta
ruotata — e restano in `colors.css` come riferimento per chi sceglie il colore
di un ciclo nuovo nel CMS: discostarsene molto rompe la garanzia che nessun
ciclo prevalga e che il contrasto sul fondo blu regga. Il commento accanto dice
perché ci sono, così fra sei mesi non sembrino codice morto da togliere.
L'unico ancora letto è `--cycle-1`: fuori da un ciclo dichiarato l'accento è
l'arancio del marchio.

**Il numero di un ciclo è unico, e la build lo pretende.** Il numero è il nome
del ciclo nel CSS, quindi due file che reclamano il 3 emettono due
`[data-cycle="3"]` e vince l'ultima: metà delle serate prende il colore
dell'altro ciclo, senza un errore da nessuna parte. Zod non può vederlo — ogni
file è valido per conto suo — e nemmeno il riferimento dell'evento, che risolve
per nome di file ed è contento comunque. `findCycleNumberConflicts` nomina
entrambi i cicli, come `findNumberDateConflicts` fa per le serate gemelle, e
per lo stesso motivo: quale dei due sia sbagliato lo sa l'associazione.

**Il CSS lo emette un componente, non un endpoint e non un file generato.**
`CycleAccents.astro` scrive le regole in un `<style is:inline set:html>`:
nessuna richiesta bloccante in più nel percorso critico per poche centinaia di
byte, e nessun artefatto da rigenerare e tenere allineato a mano — che
riaprirebbe la stessa distanza fra la collection e il CSS che questa PR chiude.
`is:inline` perché il contenuto si conosce solo alla build, e perché queste
regole non devono restare circoscritte al componente: vestono il documento.
Dalla PR 5
il componente sta in `Base.astro` e nessuna pagina deve ricordarsene.

**Una pagina che porta `data-cycle` deve portarsi anche le regole, e c'è una
guardia.** È la promessa che le PR 5, 7 e 9 devono mantenere: dimenticare il
componente non rompe niente, pubblica ogni serata sull'arancio di `:root` — una
pagina che rende perfettamente, del colore sbagliato. La guardia legge le pagine
di `dist/` e non il sorgente, perché nel sorgente `data-cycle={n}` è
un'espressione; la sua gemella sul sorgente fa il contrario, perché in `dist/`
le regole emesse ci sono per costruzione e le segnalerebbe tutte.

**La terna dell'accento diventa letterale, e accende una guardia che dormiva.**
`--accent-rgb: var(--cycle-N-rgb)` è un puntatore, e `checkRgbTriples` lo salta
apposta per non leggere `NaN`: finché gli accenti erano scritti così, quella
guardia passava sull'accento senza guardare niente. Con `--accent: #hex` e
`--accent-rgb: r, g, b` nello stesso blocco confronta davvero, e una conversione
sbagliata diventa rossa in `dist/` senza che sia servito scrivere una guardia
nuova. Un test pretende che l'accento resti un esadecimale letterale: tornare a
un puntatore la rimetterebbe a dormire in silenzio.

**Del colore che arriva dal CMS si controlla il contrasto, non il gusto.**
Le cinque regole cancellate garantivano per costruzione che un accento fosse uno
dei cinque token tarati; ora il colore lo scrive un redattore in un file, e fra
il CMS e la pagina pubblicata resta un controllo di sintassi esadecimale:
`#0a3550` è un esadecimale validissimo ed è quasi il fondo. Una guardia pretende
**3:1** sul fondo, la soglia WCAG per gli elementi d'interfaccia, che è quello
che l'accento è — l'occhiello, il bordo della scena, la tacca. I cinque stanno
fra 3.88 e 5.55, quindi non è una soglia che stringe la palette: è la riga sotto
la quale la pagina non si legge. Che nessun ciclo *prevalga* sugli altri resta
invece un giudizio sulla saturazione accanto ad altri cinque colori, e una
guardia che ci provasse discuterebbe con un designer. *(PR 4, in revisione)*

**Il valore predefinito dell'accento sta a specificità zero.** Scritto `:root`
pareggia con ogni `[data-cycle="N"]` emesso — entrambi (0,1,0) — e un pareggio lo
decide l'ordine dei documenti, che mette lo `<style>` in linea *prima* del foglio
bundlato. Oggi i due selettori pescano elementi diversi e non succede niente; il
giorno che una pagina porta `data-cycle` su `<html>`, che è il posto naturale
quando un'intera pagina appartiene a un ciclo, `:root` vincerebbe e l'intera
pagina uscirebbe arancio — con la guardia verde, perché una regola per quel ciclo
esiste davvero: chiede se c'è, non se vince. `:where(:root)` azzera la
specificità e toglie il pareggio; un test dello strato `build` pretende che il
minificatore non lo riscriva. *(PR 4, in revisione)*

**Un sesto ciclo e la serata che lo usa.** Con i soli cicli 2 e 3, che portano
esattamente due dei colori predefiniti, i due casi che contano — un colore
diverso dal predefinito, un ciclo oltre il quinto — non si vedevano girare su
contenuti veri, ed è lo stesso motivo per cui la PR 3 ha aggiunto due serate. Il
ciclo 6 è *Turni*, `#00a9b0`, calcolato come i cinque: luminosità e croma medi
della palette in oklch, tinta nel buco grande della ruota — fra il verde a 158°
e il viola a 315° — e tenuta lontana dal fondo blu, che sta a 238°. Il contrasto
sul fondo è 4.81, dentro la banda dei cinque (3.88–5.55). Ha la componente rossa
a zero, quindi il caso `#00…` della conversione — dove un `|| default` di
troppo trasforma un turchese in altro — lo esercita un contenuto vero e non solo
una fixture. La serata 83 porta `+01:00`, lo scostamento invernale che i
contenuti d'esempio non avevano.

## Layout e forme di ritaglio

*(12 agosto 2026, PR 5)*

**Il layout possiede il documento, le pagine possiedono il contenuto.** Lingua,
charset, viewport, favicon, meta, `global.css`, il salta-a e i due componenti
che devono viaggiare con ogni pagina — `CycleAccents` e `ClipShapes` — stanno in
`src/layouts/Base.astro`. Il criterio è preciso: ci sta ciò che, se una pagina
se lo dimenticasse, non farebbe fallire niente. Un accento che resta arancio,
una foto che esce non ritagliata, una pagina che perde la lingua per uno screen
reader: tre guasti muti, e il layout è il posto in cui smettono di dipendere
dalla memoria di chi scrive la pagina.

**I nomi delle forme vengono da Material 3, la geometria dal design.** Gli `id`
sono codice, quindi la regola sulla lingua li vuole in inglese; tradurre
*quadrifoglio* e *ottofoglio* a orecchio avrebbe prodotto un vocabolario
privato, e la libreria di forme di Google ha già un nome per ognuna di queste
geometrie — `4-leaf clover`, `6-sided cookie`, `8-leaf clover`, `gem`. La
tabella con la corrispondenza sta in [design.md](design.md), perché è un
giudizio sulla forma e non un dato dell'export.

**Ma un nome si prende solo se corrisponde: l'obliqua si chiama `clip-skewed`.**
Era stata battezzata `clip-slanted`, e lo `slanted` di Material è un quadrato
arrotondato su un asse inclinato mentre questa è un quadrilatero a spigoli
netti: il nome prometteva un'altra forma, che è il contrario del motivo per cui
si va a prenderli da Material. Se una geometria non ha corrispondente, porta un
nome descrittivo e la tabella lo dichiara. *(PR 5, in revisione)*

**La pillola *del design* non è una forma di ritaglio.** Il design la usa sette
volte e sempre come `border-radius: var(--radius-pill)`. Non potrebbe essere un
ritaglio: sotto `objectBoundingBox` i raggi sono frazioni di larghezza e
altezza, quindi si deformano con il rapporto d'aspetto e `rx=.5 ry=.5` dà
un'ellisse, non una capsula. Sta scritto in [design.md](design.md) accanto alle
forme, perché è lì che qualcuno andrà a cercarla. *(PR 5, in revisione)*

> **Corretta alla PR 6.** Questa decisione diceva «la pill non è una forma di
> ritaglio», senza aggettivo, e in quella forma era mezza sbagliata: vale per la
> pillola dei bottoni e non per la **Pill di Material 3 Expressive**, che è un
> quadrilatero arrotondato e inclinato, non un rettangolo con i raggi. Sono due
> geometrie diverse tenute insieme dal nome, e la decisione ne escludeva una
> parlando dell'altra. La forma di Material è ora `clip-pill`, generata come le
> altre; il raggio resta il raggio.

**Nessun pacchetto di forme di terzi entra nel repository.** Ne è stato valutato
uno durante la revisione: nessuna licenza dichiarata, nessuna indicazione se le
forme fossero originali o riprese dalle risorse di Google, e un progetto da
cinque megabyte per un'app builder. In un repository che tiene le licenze OFL
accanto ai `.woff2` sarebbe stata l'unica cosa di provenienza sconosciuta — e
per una forma non serve: le quattro che restano vengono dall'export, che è la
specifica. *(PR 5, in revisione)*

**Le forme distinte sono cinque, non sei**: l'ottofoglio è definito due volte
nell'export, una per file, perché quelli sono due design e questo è un sito
responsive solo.

**Adottare le geometrie *esatte* di Material è rimandato alla PR 6, non
scartato.** Google le genera a runtime da un poligono arrotondato e non pubblica
né i path né i parametri, quindi significherebbe dipendere dalla ricostruzione
di terzi e dalla sua licenza; le geometrie dell'export intanto sono tre righe di
cerchi ciascuna e sono tarate sull'unico posto in cui il design le applica, un
ritratto da 56×56. E in questa PR non le usa nessuno: la differenza si giudica
davanti a un ritratto vero. Cambiarle in seguito tocca solo il contenuto del
componente — gli `id` restano.

**`og:url` aspetta il dominio, e la guardia se ne accorge da sola.** Deve essere
assoluto, e finché `site` non è impostato sarebbe un URL relativo: nel markup
sembra giusto, e l'anteprima esce senza figura. La guardia lo pretende **quando
`site` c'è** — letto dalla configurazione importata, non cercato nel suo testo:
una regex avrebbe mancato un `site:` scritto su una riga sola e ne avrebbe
trovato uno dentro un commento, cioè il tripwire si sarebbe armato o disarmato
per come è formattato un file invece che per quello che dice.

**`og:image`, invece, non lo pretende, e non è una svista.** Ha bisogno di
un'immagine, non di un dominio, e il repository non ne ha una: chiederlo insieme
a `og:url` avrebbe aperto la PR 16 su una suite rossa che si poteva chiudere
solo inventando un asset che nessuno ha scelto — cioè un test che detta una
decisione di contenuto. La decisione sta in
[questioni-aperte.md](questioni-aperte.md); quello che la suite controlla è che
una pagina che pubblichi un'immagine la pubblichi assoluta, perché un
`og:image` relativo è la versione silenziosa del non averlo.
*(PR 5, in revisione)*

**Il salta-a punta al `<main>`, che prende `tabindex="-1"`.** Senza, diversi
browser scorrono la pagina e lasciano il fuoco dov'era, che è esattamente ciò
che il link doveva evitare. Usa `:focus` e non `:focus-visible`: deve comparire
appena prende il fuoco, comunque l'abbia preso.

## Verifiche

*(11 agosto 2026, PR 1)*

**Le guardie sono funzioni pure, non asserzioni scritte dentro i test.**
Prendono una stringa e restituiscono l'elenco delle violazioni. È l'unica
forma che permette di provarle **anche in negativo** senza far girare in CI
una build deliberatamente rotta: il test passa un CSS finto scritto a mano.
Una guardia che non è mai stata vista scattare non si distingue da una che non
sta guardando.

**Restituiscono un elenco, mai un booleano.** Quando una guardia scatta fra
sei mesi deve dire *quale* colore è incoerente e a che riga.

**Due strati di test.** `unit` sulle fixture e sui sorgenti, `build` su ciò
che finisce in `dist/`. Il secondo esiste perché per lo stile il sorgente non
è una prova: il minificatore può togliere cose, e una volta l'ha fatto.

**Ma per la regola 4 vale il contrario, e il sorgente è l'unico strato
possibile.** Una doppia dichiarazione in `dist/` non c'è più per definizione:
il minificatore l'ha collassata, ed è proprio quello il guasto. Le guardie
sullo stile leggono quindi anche i blocchi `<style>` dei componenti `.astro`,
non solo `src/styles/**/*.css`. Simmetricamente, per la regola 3 lo strato
`build` basta e avanza: `oklch()` e ogni `color-mix()` su un `var()` arrivano
in `dist/` intatti — viene abbassato solo il `color-mix()` a operandi
costanti, che è innocuo perché al browser arriva già un esadecimale.

**Una terna `--*-rgb` si confronta col colore dichiarato nel suo stesso
blocco.** Lo stesso nome è legittimamente ridichiarato più volte —
`[data-theme="paper"]` lo fa già, e la PR 4 emetterà un `--accent` per ciclo.
Un indice sull'intero foglio confronterebbe ogni terna con l'ultima
dichiarazione incontrata e segnalerebbe derive inesistenti.

**La regola 6 ha la sua guardia.** `font-weight: 400 900` su una famiglia a
peso unico legge come un errore, e infatti è l'unica regola del `CLAUDE.md`
che qualcuno viola credendo di fare pulizia. Il guasto è muto: nessun errore,
solo tutti i titoli un po' più grassi del disegno.

**La build gira una volta per suite**, in `globalSetup`, non una volta per
file. `REUSE_DIST=1` la salta in locale.

**Node 24, fissata in `.nvmrc`, con `engine-strict`.** npm 10 e npm 11
scrivono il lockfile in formati diversi — i campi `libc` — e la differenza
emerge come duecento righe di diff sulla macchina di qualcun altro. Meglio un
errore all'installazione che una riscrittura silenziosa.

**Il controllo di deriva del lockfile rigenera e confronta.** `npm ci` non
riscrive mai il lockfile, quindi da solo non può accorgersi di nulla: era un
malinteso nel piano iniziale.

**Il codice è in inglese, ciò che si legge è in italiano.** Cambia la regola
precedente, che imponeva l'italiano ovunque. Confine: identificatori,
commenti, nomi di file e campi in inglese; contenuti, stringhe visibili,
documentazione e messaggi di commit in italiano. Il codice già scritto è stato
migrato nella PR 2.

**Ma i nomi delle quattro collection restano in italiano** — `eventi`,
`cicli`, `sedi`, `relatori`, cartelle e chiavi. È l'unica eccezione, ed è
motivata: sono l'unico pezzo di codice che si trova davanti chi redige i
contenuti senza scrivere codice. I campi dentro quei file no, perché nessuno
li incontra: nel CMS ogni campo porta la sua etichetta italiana. Restano
italiani anche i valori di `format` — `incontro`, `proiezione`,
`presentazione` — che sono contenuto e arrivano al lettore così come sono.
*(PR 2)*

**Il campo `interventi` diventa `materials`, non `recordings`.** Tiene
registrazioni *e* materiali collegati, ed è generico apposta: domani può
essere un articolo. *(PR 2)*

**Nessuna guardia sulla lingua dei commenti.** Era prevista dal piano della
PR 2 e non è stata scritta: costava un estrattore di commenti che salta
stringhe e letterali regex — la parte più fragile della PR, per sorvegliare
della prosa — e proteggeva da un difetto che si vede nel diff e non fa danno.
Al suo posto c'è la guardia che copre il rischio vero di una rinomina: **ogni
`var(--x)` deve trovare la sua dichiarazione**. Un nome rimasto indietro non è
un errore per nessuno — Astro compila, `astro check` tace, il CSS si pubblica
e la proprietà non ha valore — ed è lo stesso guasto muto del ripiego
collassato. *(PR 2)*

**Nemmeno gli accenti nei contenuti hanno una guardia.** Ce n'era una, ed è
stata tolta: teneva una lista chiusa di sedici refusi — *perche*, *gia*,
*piu* — e sbagliava in tutte e due le direzioni. Lasciava passare le forme con
l'apostrofo, `perche'` e `piu'`, perché l'apostrofo entrava nella parola e la
parola non era più nella lista; e scattava su `citta` dentro un URL del comune,
cioè su un contenuto giusto, dove l'accento non si può mettere. La seconda metà
è quella che conta: una guardia che si può soddisfare solo cancellando un link
la si spegne, e si porta dietro il resto.

Si poteva restringere — passarle i soli campi di prosa del frontmatter invece
del file intero — e sarebbe diventata decidibile. **Si è preferito toglierla:
la regola resta, il modo di farla rispettare è rileggere.** Un accento mancante
si vede nel diff di una PR, e nessuna lista chiusa può coprire più di una
manciata di parole: verificare l'ortografia italiana per davvero vorrebbe un
dizionario con la morfologia e i nomi propri, che sbaglierebbe sui titoli delle
serate e sui cognomi dei relatori. Il confine del `CLAUDE.md` è lo stesso della
guardia sui commenti, appena sopra: **le guardie non leggono prosa.** Se un
giorno servirà, il posto è un correttore ortografico dove il testo si scrive,
non un test nella suite. *(PR 2)*

**Le guardie sullo stile leggono anche gli attributi `style` in linea.** Un
`var()` scritto in un attributo non sta in nessun foglio di stile: né nel
sorgente né in `dist/`. Rompendo un token di proposito nella pagina
provvisoria, la suite passava. È la forma che userà lo scroller per l'accento
di ogni scena. **Vale per tutte, non solo per quella sui `var()`**: le regole 3
e 4 erano rimaste ai blocchi `<style>`, e un `color-mix()` in un attributo —
che è come lo scrive l'export di Claude Design — non lo vedeva nessuno strato.
`componentCss()` è l'unica cosa che si passa ora a una guardia su un
componente. *(PR 2)*

**Il `data-*` ha due guardie, perché ha due metà.** `[data-cycle="3"]` è CSS,
`data-cycle={n}` è markup, e una guardia che legge fogli di stile vede solo la
prima: rinominato il selettore e non l'attributo, le regole non corrispondono
più a niente e ogni serata resta sull'accento predefinito, senza un errore da
nessuna parte. La seconda guardia legge il sorgente `.astro` e l'HTML
pubblicato — è lì che un attributo scritto come espressione diventa leggibile.
Guarda solo l'attributo con un valore, così una riga di commento che nomina il
nome vecchio non la fa scattare. *(PR 2)*

**Gli id delle entry si ricavano come li ricava Astro**, non con il nome del
file: il glob loader passa ogni segmento del percorso per `github-slugger` e
un campo `slug` nel frontmatter vince su tutto. Con `basename()` andava bene
solo finché ogni file era già uno slug — e il giorno che non lo fosse più il
guasto sarebbe muto: il riferimento non risolve, il nome del ciclo diventa la
stringa vuota, e la guardia sull'occhiello smette di controllare restituendo
zero violazioni. *(PR 2)*

**Un file di contenuto che non si legge fa fallire un test, non la
raccolta.** Le collection si leggono nel corpo di un `describe`, quindi
un'eccezione lì dentro non fallisce un test: impedisce a vitest di caricare
`sources.test.ts`, e tutte le guardie che ci stanno dentro risultano non
eseguite per via di un due punti nel titolo di una serata. L'errore viaggia
sull'entry e porta con sé il nome del file. *(PR 2)*

**Il `.ico` della favicon lo rigenera la build.** Era generato da uno script
che non girava da nessuna parte: due artefatti versionati, uno disegnato a
mano e uno derivato, tenuti insieme dalla buona memoria. Ora `npm run build`
lo rifà e un test dello strato `build` pretende che quello pubblicato sia
quello che il disegno corrente produce. Il confronto è sui byte, ed è lecito
proprio perché la build lo rigenera: i due lati nascono dallo stesso sharp
sulla stessa macchina. Su un `.ico` committato a mano sarebbe una guardia che
scatta sul lavoro giusto appena qualcuno compila su un'altra piattaforma.
*(PR 2)*

**La build di prova gira con `TZ=UTC`,** anche su una macchina italiana: è il
fuso di Cloudflare. Costruita a Torino, una pagina con una formattazione senza
fuso pubblica l'ora giusta per il motivo sbagliato, e la suite resta verde fino
al primo deploy. Le asserzioni dello strato `build` pretendono l'ora italiana
da una macchina che non sa che l'Italia esista. *(PR 3)*

**Il fuso sta nello script `build`, non solo nel `globalSetup`.** Scritto solo
lì, l'invariante valeva unicamente sul ramo che costruisce davvero: `npm run
build` a mano a Torino seguito da `REUSE_DIST=1 npm test` faceva leggere allo
strato `build` un `dist/` costruito in ora italiana, che trovava *ore 21* per il
motivo che quelle asserzioni esistono per escludere — e la scorciatoia
documentata per iterare in locale spegneva in silenzio l'unica prova sul fuso.
Ora ogni `dist/` prodotto da `npm run build`, da chiunque e ovunque, nasce in
UTC; il `globalSetup` lo dichiara comunque, e un test in `sources.test.ts`
impedisce allo script di perderlo. *(PR 3, in revisione)*

**Il fuso ha una guardia, non un promemoria** — regola 11 del `CLAUDE.md`.
`test/guards/dates.ts` segnala ogni `Intl.DateTimeFormat` e ogni `toLocale…`
senza `timeZone`, e ogni lettura dell'orologio dentro il modulo puro. Sono
guardie sul *codice*, non sulla prosa: il confine di `decisioni.md` regge —
qui non si legge italiano, si legge la forma di una chiamata. Il controllo è
sugli argomenti e non sul nome della chiamata, perché una guardia che vieta
`toLocaleDateString` anche quando dichiara il fuso è una guardia che il primo
caso legittimo fa spegnere, e si porta dietro il resto. *(PR 3)*

**Nessuno spogliatore di commenti JavaScript, nemmeno adesso.** Le due guardie
nuove saltano una riga che *comincia* come commento, che è l'unico modo in cui
quei nomi compaiono in prosa qui dentro. Un estrattore vero — che salti
stringhe e letterali regex — resta la cosa più fragile che si potrebbe
scrivere, ed era già stato scartato per la guardia sulla lingua dei commenti.
*(PR 3)*

**Ma dentro gli argomenti di una chiamata i commenti si cancellano.** Non è un
estrattore: la scansione di `argumentsAt` cammina già carattere per carattere
per non farsi chiudere la chiamata da una parentesi dentro una stringa, e
saltava i commenti solo per non farsi aprire una stringa da un apostrofo. Poi
però restituiva il testo con i commenti dentro, ed era la stessa guardia che
falliva aperta dall'altro verso: un `// timeZone: 'Europe/Rome'` commentato
mentre si stava debuggando rispondeva per una chiamata che non dichiarava
niente. Ora i commenti tornano come spazi, e gli a capo restano al loro posto.
*(PR 3, in revisione)*

**Una costante di fuso che non si trova nel file è una violazione, non un
dubbio.** Le guardie leggono un file per volta, quindi `timeZone: ZONE`
importato da un altro modulo è indistinguibile fra `'Europe/Rome'` e `'UTC'` — e
esportare `ROME` da `events.ts` è esattamente la prima cosa che verrà voglia di
fare il giorno in cui serve anche alla Timeline: da lì in poi ogni formattatore
del progetto passerebbe senza controllo. Un'*espressione* resta invece lasciata
stare, come prima: `zoneFor(event)` non è un nome che qualcuno ha scelto, e una
guardia che scatta sul lavoro giusto la si spegne. *(PR 3, in revisione)*

**Le guardie leggono il sorgente con le stringhe cancellate.** Il motivo ha un
nome solo: il glob con cui si carica una collection. Porta un chiudi-commento
al secondo carattere e un apri-commento al terzo, così il controllo «questo
indice sta dentro un commento?» trovava un commento aperto e mai chiuso e
dichiarava commentato tutto quello che veniva dopo. `content.config.ts` scrive
quel glob quattro volte, la prima alla riga 31: da lì in giù **tutte e tre le
guardie sul codice restituivano `[]`** su un file che nessuno aveva esentato.
Cancellare il contenuto delle stringhe non è lo spogliatore di commenti che
`decisioni.md` continua a rifiutare, e non deve esserlo: togliere una stringa
può solo togliere marcatori di commento, e ogni marcatore che toglie non era un
commento. *(PR 3, in revisione)*

**Lo strato `build` confronta contenuti decodificati.** Astro fa l'escape di
quello che stampa, quindi `quarant'anni` arriva in `dist/` come
`quarant&#39;anni`: un test che legge il frontmatter e lo cerca nella pagina
diventa rosso su qualunque stringa italiana con un apostrofo — un ruolo come
*coordinatrice dell'archivio*, una sede che si chiama *Circolo L'Isola* — su
una pagina perfettamente corretta, e nominando un test invece del file.
*(PR 3, in revisione)*

**La guardia sull'orologio guarda tutto `src/`, non solo `src/lib`.**
L'eccezione dichiarata resta una sola, `programme.ts`, ma puntata sulla sola
cartella dei moduli puri lasciava libero ogni componente e ogni pagina di
calcolarsi il proprio «adesso» — che è esattamente il sito che si contraddice
da una pagina all'altra per cui esiste la lettura unica. *(PR 3, in revisione)*

**Lo scostamento del fuso è un vincolo sui contenuti, e ha la sua guardia.**
`z.coerce.date()` è `new Date(string)`: una data senza scostamento la legge
**nel fuso della macchina che la legge**, che alla build è UTC. Una serata
scritta alle 21 si pubblica *ore 22*, e sul portatile di chi l'ha scritta si
legge giusta — nessuna delle guardie sul fuso può vederlo, perché non c'è
nessuna chiamata da guardare: il difetto sta nel file di contenuto. È l'unica
regola sul tempo che non riguarda il codice, ed è scritta in
[contenuti.md](contenuti.md) dove la legge chi redige. *(PR 3, in revisione)*

**La quarta guardia legge il testo pubblicato, non il codice.** C'è una via che
supera le altre tre: dare una `Date` a qualcosa che si aspetta una stringa —
`{scene.date}`, `<time datetime={scene.date}>` — che è un `toString()`, non è un
formattatore, non sta fra i metodi vietati, e nel sorgente si legge come una
qualsiasi interpolazione. Risponde nel fuso *e nella lingua* di chi costruisce:
«Thu Sep 24 2026 21:00:00 GMT+0200» sul portatile, «19:00:00 GMT+0000» da
Cloudflare — in inglese, dentro un sito scritto in italiano, con due ore in
meno. `checkMachineDateText` guarda quindi la risposta invece della chiamata, su
tutto ciò che finisce in `dist/`: la forma della stringa, non l'ora che dice,
perché una build sola gira in un fuso solo. *(PR 3, in revisione)*

**Lo strato `build` non asserisce mai quale serata è passata.** La pagina si
costruisce con l'orologio vero, quindi *«la serata 82 è in programma»* sarebbe
stato vero fino all'8 ottobre 2026 e poi avrebbe fatto diventare rossa la suite
su `main` senza che nessuno avesse toccato niente. Da lì si asserisce solo ciò
che non dipende da oggi: le stringhe di data, l'ordine, e la **coppia** fra lo
stato di una serata e la sua nota — che è quello che prova davvero che la
pagina la nota se la fa dare dal dominio invece di scriverla. Quale serata
cada da che parte lo decide `events.test.ts`, dove `now` è un argomento.
*(PR 3, in revisione)*

**Le asserzioni su `dist/` si ancorano a `data-number`, `data-state` e
`data-open`**, non alla decorazione della pagina provvisoria. Ancorate al `#78 · ` che quella
pagina scrive, si sarebbero rotte tutte insieme il giorno in cui la PR 7 fa
quello che il `CLAUDE.md` prescrive — sostituirla — e la prova sul fuso sarebbe
stata da riscrivere da capo. Lo scroller porterà gli stessi attributi.

`data-state` è arrivato dopo, e per una ragione precisa: lo stato di una serata
si leggeva cercando *«già svolta»* e *«in programma»* dentro il blocco
pubblicato, che contiene anche la sua descrizione. Una descrizione che nomina di
sfuggita una delle due — cosa che può scrivere chiunque rediga i contenuti —
faceva risultare la serata in due stati insieme, e il messaggio d'errore diceva
«la serata 82 non è né passata né futura» indicando qualcosa che non era
sbagliato. Lo stato lo dichiara ora la pagina in un attributo, e ne ha tre:
`cancelled` viene prima di `past`, perché una serata annullata non è né l'uno né
l'altro. `data-open` è arrivato con lo stesso ragionamento: la scena di apertura
si contava cercando le parole *apertura dello scroller*, che è decorazione di
una pagina da buttare, e il `CLAUDE.md` intanto prometteva alla PR 7 che
portarsi dietro gli attributi bastasse. O la promessa o la prova: si è spostata
la prova. *(PR 3, in revisione)*

**E le attese le ricava dai contenuti, non dalle tre serate d'esempio.**
Scritte come letterali — l'elenco `[78, 81, 82]`, il nome dell'unica sede, le
date di due serate — aggiungere la 083, aprire una seconda sede o annullare una
serata avrebbe fatto diventare rossa la suite senza che niente fosse rotto, con
il messaggio puntato su un test invece che sul contenuto: è il modo in cui una
suite insegna a non toccare i contenuti. Ora le serate arrivano da
`src/content/eventi`, i nomi delle sedi da `src/content/sedi`, e le stringhe di
data da `src/lib/events.ts` — formattate in questo processo, nel fuso di questa
macchina, e confrontate con quello che ha pubblicato una build in UTC. L'unica
data scritta a mano che resta nella suite sta in `timezone.test.ts`, sopra un
istante fisso che nessun redattore può spostare. *(PR 3, in revisione)*

**Una guardia che non trova violazioni non è una guardia che passa.** La
revisione della PR ne ha trovate cinque rotte in questo modo, dentro
l'impianto che esiste apposta per questa forma di guasto: un apostrofo negli
argomenti apriva una stringa che non si chiudeva più e faceva leggere il
`timeZone` di un'altra chiamata; il fuso era controllato per chiave e non per
valore, e `timeZone: 'UTC'` passava; i metodi locali di `Date` non li guardava
nessuno; la guardia sull'orologio era puntata su un percorso scritto a mano
invece che sulla cartella; e le righe di continuazione di un commento venivano
lette come codice. Da qui due criteri: **quando lo scanner non capisce, deve
parlare, non tacere** — un elenco di argomenti sbilanciato ora restituisce la
stringa vuota, che fa scattare la guardia — e **l'elenco dei file guardati si
ricava dalla cartella**, con l'eccezione dichiarata e a sua volta verificata:
un test pretende che `programme.ts` l'orologio lo legga davvero. *(PR 3, in
revisione)*

**Le guardie si contano accecandole, non cercandone il nome.** La domanda
«funzionano tutte?» è stata posta per la prima volta nella PR 4, e il primo
modo di rispondere — cercare il nome di ogni guardia nei test e vedere chi ha
un caso che se l'aspetta rossa — ha risposto *21 su 22* e ha accusato due volte
la guardia sbagliata: conta come i test sono scritti, non cosa tengono, e una
guardia chiamata da una helper locale non compare in nessuno degli `it()` che
la coprono. `npm run test:mutate` fa la domanda per davvero: acceca ogni
guardia a turno — le fa restituire «nessuna violazione» qualunque cosa le si
dia — e pretende che la suite se ne accorga. Ventidue su ventidue, da due a
undici asserzioni ciascuna.

La sua risposta si appoggia a una riga di output di qualcun altro, e quella riga
cambia con l'ambiente: `Tests  9 failed` sulla scrivania, la stessa riga dipinta
di codici di colore su una macchina di build. Al primo giro in CI lo strumento
ha risposto «0 su 22, la suite non ha risposto» su una suite che stava girando e
fallendo come doveva — lo stesso comando che dice due cose diverse a seconda di
dove gira, cioè il fuso orario da un altro lato. Si chiede all'ambiente di non
colorare **e** si tolgono i colori comunque, perché chi vinca fra `NO_COLOR` e
`FORCE_COLOR` non lo decide questo repository; la lettura è una funzione
esportata con i suoi test, e distingue «nessun conteggio» da «zero falliti»,
che su una guardia accecata sono risposte opposte.

Lo gira la CI e non `npm test`: costa la suite intera una volta per guardia, un
minuto abbondante, che è il prezzo sbagliato da pagare a ogni salvataggio e
quello giusto per sapere che l'impianto non è diventato decorazione.

**Prima di accecare qualsiasi cosa esegue la suite intatta, e ricostruendo.**
Senza, la risposta non vale niente nella situazione più ordinaria che ci sia: un
`dist/` stantio lascia rosso lo strato `build` prima che si tocchi niente, ogni
accecamento sembra «visto», e lo strumento stampa un tranquillo «22 su 22» senza
aver chiesto niente — lo stesso guasto che rimprovera alle guardie.

**Rimette a posto solo il file che ha accecato.** Teneva in memoria una copia di
tutti e li riscriveva tutti alla fine, il che cancellava senza dire niente
qualunque modifica fatta mentre girava — oltre un minuto, durante il quale
nessuno ha motivo di credere che il proprio editor sia pericoloso. E il ciclo
ora è asincrono: era una sequenza di chiamate bloccanti, quindi gli handler dei
segnali non potevano girare — e registrarli aveva già tolto a Node la
terminazione predefinita, cioè Ctrl-C non fermava più niente. Ogni file accecato
porta un marcatore, che rende riconoscibile una corsa interrotta all'avvio
successivo, ed è quello che la verifica finale cerca.

**E ha il suo test, perché ha lo stesso modo di fallire che caccia**: trovando
*meno* guardie di quante ce ne sono direbbe «18 su 18», che si legge come una
risposta. Il conto si fa due volte e in modi diversi — le due metà non devono
condividere né l'elenco dei file né il modo di riconoscere una dichiarazione,
altrimenti concordano su ciò che non esiste, che è l'unica cosa su cui devono
poter litigare. *(PR 4)*

**L'indipendenza dal fuso si prova eseguendo, non dichiarando.** `TZ` si legge
una volta all'avvio del processo, quindi una suite sola prova solo la macchina
su cui gira: in CI è UTC, su una scrivania a Torino no, ed è esattamente quella
differenza che deve essere invisibile. Due processi figli girano lo stesso
modulo sotto i due fusi e i risultati si confrontano fra loro **e** con
l'attesa: l'uguaglianza da sola passerebbe su due risposte sbagliate allo
stesso modo. *(PR 3)*

## Design system

*(12 agosto 2026, PR 6)*

**Un componente rende l'elemento che il compito richiede: `Button` è un
`<button>`, e un `<a>` quando riceve `href`.** Nell'export il bottone è sempre
avvolto da chi lo rende cliccabile — `<a><button>…</button></a>` per un link,
`<button><button>…</button></button>` per un'azione — che è markup non valido
due volte e, davanti a una tastiera, sono due fermate di tabulazione per una
cosa sola. Non si replica un difetto perché sta nella specifica.

**L'effetto premuto è `:active`, e lo stato sparisce.** Era l'unico componente
con stato, ed era React per tre righe di CSS: ombra via e due pixel in giù.
`:active` dice lo stesso, funziona sotto un dito, e non resta premuto quando il
puntatore esce dall'elemento a metà clic — che nell'export costava un terzo
gestore di eventi.

**`Brand` non ha la prop di forma.** Regola 7. Nell'export la variante breve era
per metà muta — la prima riga rendeva lo stesso identico testo — e a cambiare
erano il maiuscolo e la sparizione di «in Periferia»: togliere la prop non
toglie niente se non il modo di sbagliare. La firma sta nel template, non in un
valore predefinito, perché un valore predefinito è qualcosa per cui si può
passare altro.

**La banda porta la firma intera, «MINIERA CULTURALE IN PERIFERIA».** L'export
scrive la forma breve, che è la variante vietata dalla regola 7 scritta in un
altro carattere. Nessuna delle due schermate usa la banda, quindi non c'è un
layout che la stringa più lunga possa rompere, e l'uso ovvio del componente
adesso è quello giusto.

**E porta `data-brand`, deciso in revisione.** Era stata lasciata senza, con
l'argomento che è una fascia tipografica e non il marchio, e che una banda che
dice «GIOVEDÌ SERA» è una cosa legittima da volere. Quello che restava era un
`text` libero capace di pubblicare il marchio breve su ogni pagina con un piè di
pagina, senza che nessuna delle due guardie della regola 7 potesse vederlo: una
si aggancia a quell'attributo, l'altra legge solo `Brand.astro`. Una fascia con
un altro testo si può ancora scrivere; semplicemente non è questo componente,
il cui predefinito *è* la firma.

**Le misure numeriche dell'export diventano custom property con il default nel
componente.** `altezza` e `corpo` reggevano proporzioni calcolate in JavaScript
— la barra del marchio è `altezza * 0.16`, il sottotitolo `altezza * 0.5`. Ora
sono `--brand-height`, `--band-size`, `--badge-size`, `--guest-size`,
sovrascrivibili con un `style` in linea. Il default dichiarato nel `<style>` del
componente non è comodità: senza, la proprietà non sarebbe dichiarata in nessun
foglio e la guardia sui token avrebbe ragione a dirlo.

**Il ritratto entra in `GuestRow`, come slot.** Nell'export il riquadro 56×56 e
il suo `clip-path` stanno nel markup della scena, accanto a un `RigaOspite` che
non ne sa niente: misura e forma vivono fuori dal componente che possiede
l'ospite, e lo scroller della PR 7 le avrebbe ricopiate. Chi lo usa passa
un'immagine e ottiene la forma senza doverne sapere l'esistenza.

**`EventCard` non ha un indirizzo predefinito.** Quello dell'export ne aveva
uno, e i file di design ne portano tre versioni incoerenti. Un componente non è
la seconda sorgente di dove si riunisce l'associazione: `venue` è obbligatoria e
viene dalla collection.

**Le date che entrano in un componente sono stringhe già formattate.** Regola
11: le stringhe le scrive `src/lib/events.ts`, in `Europe/Rome`, e una `Date`
data a qualcosa che si aspetta testo è un `toString()` che nessuna guardia sulla
forma della chiamata riconosce. Tipizzare la prop come `string` rende la cosa
impossibile invece che sconsigliata.

**Le varianti si dichiarano come attributi `data-*`, non come classi.** Le
classi Astro le lascia leggibili ma le lega a un `data-astro-cid-*`; un
attributo è ciò che una guardia e un'asserzione possono leggere nel pubblicato
senza inseguire un hash. E le attese dei test sono **nomi di token**, mai
colori: un esadecimale scritto in un test diventerebbe rosso il giorno che un
ciclo viene ritarato nel CMS, indicando un file di test invece del contenuto che
è cambiato.

**La rassegna dei componenti è una pagina pubblicata, `/componenti`, con
`noindex`.** Pubblicata perché lo strato `build` legge `dist/` e nient'altro: il
`CLAUDE.md` dice che per lo stile guardare il sorgente non basta, quindi una
rassegna viva solo in `npm run dev` lascerebbe le varianti di ogni componente
verificate da nessuna parte. Fuori dall'indice perché è una pagina di servizio —
e la sitemap della PR 16 dovrà escluderla. Non `/rassegna`, che è della rassegna
stampa della PR 13.

## Forme di ritaglio, la geometria

*(12 agosto 2026, PR 6 — chiude la questione aperta della PR 5)*

**Le geometrie di Material 3 si ricostruiscono, e la ricostruzione è nostra.**
I nomi venivano da Material dalla PR 5; ora ci va anche la forma. Google non
pubblica né i path né i parametri — le genera a runtime da un poligono
arrotondato — e nessun pacchetto di forme di terzi entra nel repository, deciso
alla PR 5. Restava una strada sola: generarle qui, con parametri nostri, scritti
accanto alla forma in `src/lib/shapes.ts`.

**E si dice quello che sono: ispirate a Material, non le geometrie di Google.**
Senza parametri pubblicati la taratura si fa a occhio contro le immagini di
riferimento, e scrivere in `design.md` che sono *le* forme di Material
prometterebbe una fedeltà che nessuno può verificare. È la mezza verità che
questo repository passa il tempo a cacciare, e vale anche quando a dirla è la
documentazione.

**Le forme a lobi si costruiscono con i cerchi, non arrotondando un poligono.**
Il primo tentativo è stato una stella con gli angoli tagliati da archi tangenti,
che è la costruzione ovvia ed è quella sbagliata: l'arco a un vertice non può
essere più largo del vertice stesso, quindi rientranze profonde danno punte
aguzze e punte tonde danno rientranze piatte. Un quadrifoglio vuole tutt'e due
insieme, e solo i cerchi danno tutt'e due insieme — l'export lo sapeva, e infatti
disegna i suoi quadrifogli come cerchi sovrapposti. A cambiare qui è il raccordo:
un arco concavo dove l'export lascia una cuspide, ed è quasi tutto quello che
distingue una forma di Material da un fiore.

**`clip-skewed` tiene la geometria dell'export.** Material non ha un
corrispondente — il suo `slanted` è un quadrato arrotondato su un asse inclinato
— ed è già deciso alla PR 5. Le ricostruite sono quattro su cinque, e la tabella
in [design.md](design.md) lo dichiara.

**Gli `id` non cambiano, ed è il collaudo di ciò che la PR 5 aveva promesso.**
Cambiare geometria tocca il contenuto del componente e niente altro: nessuno di
chi le referenzia se n'è accorto, e le asserzioni che pretendono ogni forma
su ogni pagina sono rimaste verdi senza essere toccate.

**Una forma sbagliata non fa fallire niente, quindi ciò che è aritmetica si
prova come aritmetica.** Path chiuso, coordinate dentro `[0, 1]`, un arco per
lobo e uno per raccordo, la simmetria che il numero di lobi implica, e il lobo
che tocca davvero il bordo del riquadro — ricostruendo il cerchio dell'arco,
perché il punto più esterno di una forma non è mai fra le coordinate scritte nel
path. Quello che resta all'occhio è la taratura, che è il controllo manuale.

**Un `<clipPath>` vuoto ha la sua guardia**, perché è il modo in cui questo
generatore fallisce: rifiuta di disegnare ciò che non sa disegnare e restituisce
la stringa vuota. Un ritaglio vuoto non viene ignorato — ritaglia *tutto*, cioè
pubblica un buco al posto della foto, con l'`id` che risolve e ogni altra
guardia verde.

## Lo scroller

*(13 agosto 2026, PR 7)*

**L'apertura sulla prima serata futura è uno script in linea, ed è l'unica cosa
qui che il CSS non può fare.** Un documento si apre in cima e la posizione di un
contenitore scorrevole non la imposta un foglio di stile. Sono dieci righe senza
dipendenze, sincrone e messe dopo il markup che spostano: girano prima della
prima pittura, quindi il programma viene *disegnato* alla serata giusta invece
di essere disegnato in cima e saltare. Senza JavaScript si apre dalla serata più
vecchia e si scorre normalmente: è tutto il degrado che c'è, ed è un test
manuale.

**La posizione si misura, non si calcola.** `scrollTop = indice × altezza`
sarebbe la strada dell'export e obbligherebbe lo script a sapere quanto è alta
una scena; chiedere all'elemento dov'è dà la stessa risposta e continua a darla
il giorno che una scena cambia altezza. Con `content-visibility` le altezze sono
quelle intrinseche dichiarate, che è esattamente ciò che rende la misura esatta
anche su una scena mai renderizzata.

**L'accento è per sezione e statico; quello globale arriva con la Timeline.**
Nell'export il `data-ciclo` sta sul contenitore radice e cambia a ogni scena,
cioè l'accento dell'intero sito segue lo scorrimento — e per farlo bisogna
sapere quale scena è a schermo. Qui ogni sezione porta il proprio `data-cycle` e
si colora da sola, senza osservatori. Nav e Timeline che virano sono la PR 8,
che quell'osservatore ce l'ha già per `aria-current`.

**Nessuna scena è a sua volta scorrevole.** L'export lo fa, e
[vincoli-tecnici.md](vincoli-tecnici.md) dice perché non si copia: con due
contenitori scorrevoli annidati né una tastiera né uno screen reader sanno a
chi parlano le frecce, e quello interno si mangia il gesto che doveva portare
alla serata dopo. Il testo lungo si stringe con la tipografia fluida e, su
schermo basso, si taglia a tre righe e poi a due — ritagliato, mai scorrevole.
La guardia conta i contenitori scorrevoli della pagina e ne pretende **uno**:
scritta sul conteggio e non sul nome della classe, perché una guardia agganciata
a `.scene` smette di guardare il giorno che qualcuno rinomina.

**Su schermo basso una scena cede in un ordine dichiarato, e non a caso.**
Trovato provando: a 390×800 la locandina si prendeva `30vh` fissi mentre il
testo voleva ancora tutto il suo, e i bottoni dei materiali finivano sotto il
bordo — irraggiungibili, perché la scena non è scorrevole. Adesso la locandina è
una riga di griglia che prende **quel che resta** invece di una quota del
viewport, e sotto certe altezze si perde, nell'ordine: la descrizione (tre
righe, due, via), poi la locandina, poi le presenze. Titolo, data, luogo,
bottoni e nota non si toccano mai — sono ciò che rende una scena leggibile a
colpo d'occhio e utilizzabile.

È difendibile per una ragione strutturale e non per gusto: dalla PR 9 ogni
serata è anche una pagina sua, con tutto. Lo scroller è la vetrina, non
l'archivio. Le soglie sono due serie separate, perché i due layout non
finiscono lo spazio alla stessa altezza: impilato, la foto sta sopra il testo e
lo stringe presto; affiancato, il testo ha la sua colonna e un portatile a
1440×900 ha aria da vendere — tagliare lì avrebbe accorciato una descrizione che
ci sta.

**Una scena ha un bottone solo, e apre un modale.** Prima ne aveva uno per
registrazione, e su 390×800 il secondo finiva sotto il bordo — con la scena non
scorrevole per scelta, quello è contenuto che nessuno può raggiungere. Ora i
materiali stanno dietro un «Rivedi la serata» e la prenotazione dietro «Prenota
il posto», e tutt'e due aprono **lo stesso** `<dialog>`: uno per pagina, come la
PR 12 aveva già deciso, perché con ottantuno serate un modale ciascuna sarebbero
ottantuno copie della stessa cornice nel DOM.

**Il modale si riempie clonando markup che è già nella pagina, mai costruendolo
dai dati.** I link agli interventi di una serata sono `<a href>` veri dentro la
scena, nascosti dal CSS *solo dopo* che lo script è partito: con gli script
spenti sono semplicemente lì, in una lista, e non si perde niente. Una sola
fonte, per giunta — una lista più una copia in un `<template>` divergerebbero il
giorno che qualcuno ne modifica una. Una guardia pretende che quei link stiano
fuori dai template, perché dentro sarebbero invisibili a chi non ha script, a un
crawler e a Ctrl+F.

**La classe `no-js` sul documento, tolta dal primo script della testa.** È
l'unica cosa che permette a una pagina di portarsi dietro entrambe le forme —
il bottone e la lista — e di mostrare quella che funzionerà davvero, senza un
lampo dell'altra. Costa due regole CSS e nessuna rotta anticipata.

**Il testo della prenotazione sta in un `<template>`, e lì va bene**: è scritto
per il modale e non ha un posto nella pagina finché non lo si chiede, a
differenza dei link di una serata, che sono contenuto. Il numero a cui scrivere
non c'è ancora — è quello del presidente, il design aveva un segnaposto, e
pubblicarne uno sbagliato è peggio che non pubblicarne. Arriva con la PR 12, e
con lui il link diretto che dà a quel bottone qualcosa da fare anche senza
script.

**`<dialog>` e `showModal()` invece di un modale scritto a mano.** Fanno gratis
ciò che sarebbero cento righe: il fuoco entra e non esce, Esc chiude, il resto
della pagina diventa inerte, e il fuoco torna al bottone che l'ha aperto. Safari
li ha dalla 15.4 — la stessa versione di `svh`, cioè esattamente la soglia che
questo progetto si è già dato.

**Un contenitore scorrevole dentro un dialog è l'eccezione alla regola dello
scroller unico, e va scritta nel selettore.** Mentre un modale è aperto il resto
della pagina è inerte, quindi non c'è ambiguità su quale scatola stia scorrendo.
La guardia legge il CSS e non può sapere che un `.modal-panel` sta dentro un
dialog: perciò l'eccezione la si dichiara scrivendo `dialog.modal .modal-panel`,
e chi scrive `.modal-panel` e basta viene segnalato — giustamente.

**Il titolo di pagina si dice, non si mostra.** Il design non ne ha uno — i
titoli delle serate erano tutti `<h1>` — e qui sono `<h2>` sotto un `<h1>`
unico, che però nel disegno non ha posto. Sta nel markup con
`.visually-hidden`, la prima classe di utilità del progetto: `clip-path` e un
pixel, non `display: none`, che lo toglierebbe anche dall'albero di
accessibilità.

**Una sola immagine si carica subito, ed è quella della scena di apertura.** Non
la prima del documento: con il programma che si apre sulla prossima serata, la
prima è da qualche parte nell'archivio e non la vede nessuno.

**I target di build sono la soglia dei browser, dichiarata.** Vedi
[vincoli-tecnici.md](vincoli-tecnici.md): senza, il minificatore riscrive
`max-width` nella sintassi range, che è Safari 16.4 contro una soglia di 15.4 —
e ogni media query dello scroller smette di applicarsi su iOS 15.4–16.3, con il
telefono che riceve il layout desktop e il sorgente che ha ragione. Trovato da
un test che leggeva il CSS pubblicato per un'altra ragione.

**Due locandine segnaposto entrano nei contenuti d'esempio.** Senza immagini la
colonna della locandina resta vuota, il layout a due colonne è metà lavoro e
`loading="lazy"` è un test scritto su niente. Sono generate — forme e colori del
marchio, nessun volto — e dichiarate come segnaposto nel file che le usa. Escono
quando arrivano le foto vere: [questioni-aperte.md](questioni-aperte.md).

**Le proporzioni su schermo piccolo si tarano una volta sola, alla PR 17.** Su
un telefono la scena divide l'altezza con la Timeline in basso e la navigazione
in alto, che alla PR 7 non esistono: ogni misura decisa prima va rifatta quando
arrivano. Quello che alla PR 7 doveva essere giusto è la struttura — niente
contenuto irraggiungibile, nessuna scena scorrevole — e quello lo è.

**L'immagine della serata tiene la sua forma inclinata anche sul telefono: è
del marchio, non decorazione.** Era stata sdraiata per far spazio, e sbagliando:
la capsula girata sull'angolo è una firma visiva come la barra arancione del
marchio, e le firme non si tolgono quando sono scomode. Quello che si tocca è lo
spazio che ha — un quarto dello schermo garantito — e l'altezza del riquadro,
che la geometria limita: un rettangolo ruotato di 45° occupa `(w + h) / √2` in
*entrambe* le direzioni, quindi in una fascia larga 342 non può superare i 200
di altezza senza che gli angoli escano, e niente li ritaglia.

**E non è una locandina.** Il nome era sbagliato in tutto il codice: una
locandina è un manifesto che annuncia, questa è un'immagine che accompagna il
racconto della serata — passata o futura che sia. Il campo dello schema si
chiamava già `photo`; adesso combaciano anche la cartella, le classi e le
didascalie dei segnaposto.

**I link dentro il modale sono crema con la sottolineatura nel colore del
ciclo, non testo colorato.** L'arancione predefinito era il colore del ciclo 1 e
su ogni altra serata si leggeva come uno sbaglio. Ma il colore pieno del ciclo
non può fare il testo: la garanzia che il progetto si è dato è **3:1**, la
soglia di un bordo o di un'icona, mentre un testo ne vuole 4,5 — e due cicli su
sei non ci arrivano sulla superficie rialzata, il verde a 3,82 e il turchese a
3,89. Il colore va quindi dove 3:1 è la soglia giusta, cioè la riga sotto la
parola, e la parola resta al contrasto del testo normale.

**Le dimensioni scalano per `clamp()` con limiti fissi, non per percentuale
pura.** Una percentuale vera dipende dal contenitore e per le altezze non ha un
riferimento; le unità viewport da sole diventano assurde sui ventisette pollici
e illeggibili sui 320 px. Quello che invece va corretto — ed è la PR 17 — sono i
**limiti in px** dei `clamp` tipografici: nessuno dei tre termini dipende dalla
dimensione del carattere di base, quindi chi ingrandisce il testo dal sistema
non ottiene niente. La scala degli spazi a passi di 4 px resta com'è: scalare
tutto col viewport rompe le proporzioni fra ciò che scala e ciò che non può, a
partire da un bordo di un pixel.

## La Timeline

**Una tacca è un'ancora, non un bottone.** L'export scrive `<button
onClick={vai}>`, e quel bottone fa quello che qualcuno gli scrive e nient'altro.
`<a href="#serata-81">` è l'elemento per una cosa che porta a un punto del
documento, e porta con sé l'indirizzo condivisibile, il tasto indietro,
l'apri-in-nuova-scheda, l'annuncio che uno screen reader fa per un link, la
messa a fuoco che si sposta e il salto che il browser esegue da solo. Nessuna di
queste è scritta da noi. Non è stata scelta per chi ha gli script spenti — su
quello i numeri onesti sono lo 0,2% di chi li disattiva e circa l'1% di chi non
li riceve — ma perché **costa meno del bottone**: che funzioni senza script è
quel che la scelta più economica regala. *(PR 8)*

**Lo scroller non anima i salti.** `scroll-behavior: smooth` c'è stato dalla
PR 8 alla PR 9 ed è stato tolto, perché un salto animato è interrompibile: un
secondo salto partito mentre il primo è in volo il motore lo lascia cadere, e il
programma resta sulla prima destinazione mentre rotaia, accento e indirizzo
dicono la seconda. Due tacche toccate a due decimi di distanza bastano — e la
PR 8 l'aveva visto, in una forma indistinguibile da un errore di misura, e
l'aveva archiviato come tale.

Non è una rinuncia scambiata con la correttezza. `scroll-behavior` raggiunge
**solo** gli scorrimenti chiesti da uno script, e qui sono tutti salti a una
serata: tutto ciò che quella proprietà comprava era rendere interrompibile
l'unica cosa che quei salti devono fare. In cambio `prefers-reduced-motion` è
soddisfatto per costruzione invece che da una regola che deve continuare a
vincere, e sparisce la macchinetta che accendeva la proprietà sull'evento
`load`. *(PR 8, tolto in PR 9)*

**E se l'animazione tornasse, tornerebbe come proprietà — mai come argomento.**
Un `{ behavior: 'smooth' }` passato a una chiamata batte il
`scroll-behavior: auto !important` che `global.css` mette sotto
`prefers-reduced-motion`: l'argomento vince sulla proprietà, per specifica e in
ogni motore. Sarebbe un guasto invisibile in `dist/`, che non fa fallire niente
e colpisce esattamente le persone per cui l'impostazione esiste. La guardia
resta, e adesso conta di più: rimettere l'animazione così è la prima cosa che
verrà in mente a qualcuno. Ogni salto continua a chiamare `scrollIntoView()`
senza argomenti. *(PR 8)*

**L'accento globale sta su `<html>`.** È il giorno che il commento di
`:where(:root)` in `colors.css` aveva previsto: scritto `:root`, quella regola
avrebbe pareggiato con le regole emesse dai cicli e vinto per ordine dei fogli,
e la rotaia intera sarebbe stata arancione sopra una serata verde. Le scene
continuano a portare il proprio `data-cycle` e vincono dentro di sé, perché le
proprietà personalizzate ereditano dall'antenato più vicino che le dichiara: il
documento decide solo per ciò che nessuna scena contiene. Il valore di partenza
lo scrive la build, ed è quello della serata di apertura — che è anche tutto
quello che vede chi non esegue script, ed è giusto per lui. *(PR 8)*

**Una finestra di tacche, e la tacca porta la distanza vera.** Ottantuno tacche
da una ventina di pixel sono milleseicento pixel di rotaia in una colonna alta
una schermata. Stanno tutte nel markup — sono il programma, e un crawler e
Ctrl+F devono trovarle — e se ne mostra un intorno della corrente, il che tiene
anche settanta link fuori dall'ordine di tabulazione. L'export distingue tre
ranghi (corrente, adiacente, resto) e li usa per tre misure; qui l'attributo
porta la **distanza**, non il rango, perché è ciò che permette al solo foglio di
stile di stringere la finestra a tre sulla barra del telefono. Con i tre ranghi
l'unico modo sarebbe stato un secondo numero in JavaScript, e il markup sarebbe
stato sbagliato per chiunque non lo esegua. *(PR 8)*

**Le tacche sono i figli della striscia, senza una lista intorno.** Una lista è
il modo ordinario di marcare dei link di navigazione, e qui annuncia una cosa
falsa: ottantuno elementi di cui se ne vedono undici, perché a nascondersi è la
tacca e l'`<li>` intorno resta. Resta in due modi, e tutti e due sono
dell'involucro e non della finestra — nell'albero dell'accessibilità, dove uno
screen reader legge settanta elementi vuoti, e nel layout, dove un `<li>` vuoto
è ancora un elemento flex e un `gap` si disegna fra elementi flex anche quando
non contengono niente. Con ottantuno serate erano mille pixel di rotaia vuota,
con le undici tacche visibili spinte sotto il bordo dello schermo — trovato
provando, prima dell'altra metà. Tolto l'involucro, `gap` torna corretto: un
figlio in `display: none` non è un elemento flex, quindi non gli si disegna
niente accanto. *(PR 8, la seconda metà in revisione)*

**L'accento va sulla tacca e mai sulla data.** Quello che i cicli garantiscono è
**3:1** sul fondo — la soglia di un bordo o di un segno — mentre una parola ne
vuole 4,5, e a 15px tre dei cinque colori tarati non ci arrivano: l'arancio a
4,35, il rosa a 3,92, il viola a 3,88. È la stessa decisione che `Modal.astro`
aveva già scritto per il link dentro il pannello, e che la rotaia aveva
contraddetto: il colore va dove 3:1 è la soglia giusta, e la parola resta al
contrasto del testo normale. A dire «questa» restano la misura, il peso e il
segno colorato. *(PR 8, in revisione)*

**Il colore delle tacche lontane non è quello dell'export.** Lì è il 34% del
crema, che sul blu compone **2,66:1** — sotto il 3:1 che questo progetto
garantisce a un bordo, figurarsi a otto tacche di data a 11px, e sotto qualunque
altra cosa il sito spedisca. Portato a 0,44, che è dove sta `--text-muted`, cioè
il pavimento di questo repository per un testo che si deve poter leggere. Il
gradino verso la tacca vicina sopravvive: 5,27 contro 3,50. Un mockup non è un
rapporto di contrasto. *(PR 8, in revisione)*

**La rotaia sta prima del programma nel documento.** È fissa, quindi dove sta
nel markup non cambia niente a schermo e cambia tutto per una tastiera: dopo lo
scroller, le sue tacche venivano dopo ogni bottone di ogni serata, cioè
ottanta fermate prima dell'unico comando che esiste per non doverle fare. *(PR
8, in revisione)*

**`--timeline-bar` è una somma, non una misura letta a schermo.** La tacca, il
suo margine interno sui due lati, il filo di bordo, e il passo con cui la barra
si stacca dal fondo. Un numero letto una volta smette di essere vero la prima
volta che qualcuno alza il bersaglio da toccare — la cosa ovvia da fare a una
fila di pillole — e quello che costa allora è la nota di ogni scena che scivola
sotto la barra, sul telefono, in silenzio. *(PR 8, in revisione)*

**`justify-content: center` non centra quando il contenuto non ci sta.** La
barra del telefono doveva ritagliare le tacche di troppo simmetricamente ai due
lati; una riga flex che trabocca viene invece allineata all'inizio — i motori si
rifiutano di perdere contenuto dal bordo iniziale — e la barra mostrava le
serate più vecchie della finestra con quella corrente fuori schermo a destra. La
finestra si stringe nel foglio di stile, non nella traslazione della striscia
che fa l'export: quella vorrebbe misurare i nodi, un listener sul
ridimensionamento e tacche di larghezza fissa, che le nostre date non hanno.
*(PR 8)*

**`aria-current` lo scrive la build, non solo lo script.** In `dist/` non gira
nessuno script: una rotaia che aspettasse il suo arriverebbe senza niente
marcato, e lo strato `build` — l'unico che questo repository considera serio —
non avrebbe niente da leggere. Valore `true` e non `location`: `location` è il
token più preciso, `true` è quello che ogni screen reader annuncia. *(PR 8)*

**La guardia `bersaglio` resta, con un compito diverso.** Nel design protegge lo
scorrimento morbido dallo snap; qui il salto lo fa il browser, e quel che la
guardia impedisce è che `aria-current`, l'accento e la finestra lampeggino
attraverso quaranta serate mentre lo scorrimento le attraversa. Flag più timer
da 1200 ms, come nel codice del design — il timer perché uno scorrimento morbido
interrotto dallo snap può non arrivare mai. *(PR 8)*

**La rotaia è più larga di quella del design, e la misura è misurata.**
L'export dichiara `clamp(104px, 8.5vw, 140px)` e scrive `20 mar` sulle sue
tacche; le nostre leggono `24 set 26`, con l'anno che la PR 3 ha aggiunto perché
su ottantuno serate *18 giugno* non identifica niente. Con la larghezza del
design le date uscivano dal bordo destro dello schermo. Il numero viene dal
misurare la riga della tacca corrente — 115px — e non dal ritoccare finché non
sembra a posto. *(PR 8)*

**La colonna non prende gli eventi del puntatore, le tacche sì.** Un riquadro
fisso sopra lo scroller viene interrogato per primo dal hit-testing, e una rotella
sopra di esso cerca un antenato scorrevole *suo*: trova il documento, che è alto
una schermata e non si muove. Il risultato è una striscia in cui il programma
non scorre. Spenti gli eventi sulla colonna, la rotella raggiunge la scena
sotto; le tacche li riprendono, e la striscia morta è larga quanto loro. Sulla
barra del telefono invece gli eventi restano, perché lì c'è un fondo e un bordo
e un dito che la tocca sta su un controllo. *(PR 8)*

## La Timeline che raggiunge l'archivio

**Ogni serata ha la sua tacca visibile.** Fino alla PR 9 le tacche fuori dalla
finestra erano `display: none`: undici su ottantuno, quindi dalla rotaia si
raggiungevano solo le vicine e per arrivare alla dodicesima si scorrevano
settanta schermate. La rotaia non faceva la cosa per cui esiste. L'export ha lo
stesso limite e non ci è mai arrivato, perché nei suoi file di design le serate
sono sei — ed è il committente ad averlo visto, guardando la barra su un
telefono, non un test. *(PR 11)*

**Sul desktop le lontane sono marchi senza data.** Ottantuno trattini da sei
pixel di passo stanno in circa cinquecento, accanto ai trecento delle undici
etichettate: l'archivio intero entra in una colonna alta una schermata, e le
date restano leggibili dove si sta. Non è un meccanismo in più — è un valore in
più su una scala che c'era già, e la tacca porta **già** la distanza vera invece
di un rango tagliato a due. È la decisione della PR 8 che paga adesso. *(PR 11)*

**E il passo lo porta il padding, non il margine.** Scritto come margine, il
passo era lo stesso e il bersaglio erano i due pixel del trattino: il margine
sta fuori dalla scatola e non prende il clic. *(PR 11, trovato provando)*

**Sul telefono la barra scorre in orizzontale.** Ottantuno trattini ci
starebbero anche lì, ma un bersaglio da quattro pixel per un dito non è un
bersaglio: la barra scorrevole tiene le pillole con la loro data, che è come
funziona ogni selettore di date su un telefono. *(PR 11)*

**L'eccezione a «un solo contenitore scorrevole» si scrive nel selettore e si
verifica sull'asse.** La regola esiste contro l'annidamento — due scroller
verticali uno dentro l'altro e non si sa a chi parlano le frecce — e la barra è
fissa, sta fuori dal programma e si muove sull'altro asse, quindi non prende
nessun gesto che lo scroller volesse. Dal CSS niente di tutto questo si vede in
`.timeline-strip`, quindi la regola dice `[data-timeline]` a voce alta, come il
modale dice `dialog.modal .modal-panel`. Ma il nome da solo non basta: la
guardia esenta un box che scorre **orizzontalmente** e porta quell'attributo,
perché `[data-timeline] { overflow-y: auto }` sarebbe un secondo scroller
verticale con l'etichetta giusta — cioè esattamente la cosa per cui la guardia
esiste. *(PR 11)*

**Senza script la barra del telefono si apre all'inizio dell'archivio.**
`scrollLeft` non lo imposta nessun foglio di stile, quindi la posizione iniziale
la può dare solo uno script: chi non ne ha vede le pillole della prima serata
mentre `aria-current` sta su una fuori schermo. È una degradazione **nuova** —
prima la barra era giusta anche senza script — e si accetta perché una barra
vive per essere toccata, e un bersaglio che un dito non prende non serve a
nessuno. L'alternativa scartata erano i marchi nudi anche sul telefono: niente
si degrada, e il bersaglio torna a quattro pixel. *(PR 11)*

## Le rotte delle serate

**`/81` non è una pagina della serata 81: è il programma aperto sulla serata
81.** Il piano lasciava intendere un documento diverso dallo scroller, e non lo
è — stesse scene, stesso ordine, stessa rotaia, e in più i meta di quella
serata. È ciò che rende vero il motivo per cui quegli indirizzi esistono: un
link incollato in chat mostra titolo e figura per i meta Open Graph della rotta
che nomina, non per il suo percorso. *(PR 9)*

**Lo scroller è un componente e le rotte sono due.** `Programme.astro` tiene il
markup, i tre script e gli stili; `index.astro` gli passa la prima serata futura
e `[number].astro` la propria. Copiato nella seconda pagina sarebbe due sorgenti
per una schermata sola. *(PR 9)*

**L'indirizzo segue la serata a schermo, e si sostituisce.** Le tacche restano
frammenti — puntarle a `/N` farebbe scaricare duecento kilobyte di documento per
fare il lavoro di uno scorrimento — quindi a tenere allineato l'indirizzo è
`history.replaceState` dentro l'osservatore che c'è già. Con `pushState` sarebbe
una voce di cronologia per ogni serata attraversata, e il tasto indietro
smetterebbe di uscire dal sito per mettersi a risalire l'archivio: è la
differenza di una parola e ha la sua guardia. *(PR 9)*

**E si aggiorna al cambio, non all'apertura.** Riscrivere `/` in `/81` appena la
pagina si apre consegnerebbe a chi mette un segnalibro sulla radice un indirizzo
che invecchia: a novembre quel segnalibro aprirebbe ancora l'ottantunesima, che
nel frattempo è passata. `/` è l'unico indirizzo che non invecchia e resta
finché il lettore non si muove. *(PR 9)*

**L'`<h1>` di ogni rotta nomina la sua serata**, e resta invisibile. Ottantuno
documenti con lo stesso corpo e meta diversi sono contenuto duplicato: quel
titolo è la sola cosa dentro il corpo che li distingue per chi li indicizza. La
radice tiene il suo, che parla del sito — perché è «la prossima serata», quando
la si legge. *(PR 9)*

**Una serata annullata d'esempio entra nei contenuti, prima di quella di
apertura.** Senza, il ramo `cancelled` non arriva in `dist/` e il test può solo
pretendere che la regola della barratura esista — non che finisca su qualcosa.
Con lei si prova anche che il programma la salta e si apre sulla successiva.
Collocata lì apposta, perché è lì che il salto si vede. Esce quando arrivano le
serate vere, come le immagini segnaposto. *(PR 9)*

**La barratura sta in `Scene.astro`, agganciata a `data-state`.** C'è un posto
solo perché c'è un template solo: la rotta `/80` è quella stessa scena, aperta
su di lei. Lo stato lo decide `stateOf` nel dominio, una volta, e ogni parte del
sito fa la stessa domanda allo stesso attributo. È barrato quello che
l'annullamento toglie — il titolo e la data — e non il luogo, che resta dov'è.
`line-through` non lo annuncia nessuno screen reader: a dirlo a parole ci sono
già l'etichetta «annullata» sopra il titolo e la nota «Serata annullata» sotto.
*(PR 9)*

**Il programma si legge una volta per build, e mai in `astro dev`.** Ogni rotta
parte da `loadProgramme()`, e senza memoria erano ottantadue letture delle
stesse quattro collection con ciclo, sede e relatori risolti da capo ogni volta:
quadratico nella dimensione di un archivio che può solo crescere. Ciò che compra
oltre ai secondi è che ogni rotta riceve le *stesse* scene, quindi un indice che
una rotta calcola è un indice nell'array che legge la successiva. In sviluppo no:
il modulo sopravvive al salvataggio di chi scrive, e un programma in cache
continuerebbe a servire le serate com'erano all'avvio del server — dalla PR 14
quei file li scrive il CMS, e non mostrare la modifica è l'unica cosa che
un'anteprima non può fare. E un `now` diverso da quello della build non viene
mai messo in cache: è qualcuno che chiede di un altro giorno, e rispondergli
dalla memoria risponderebbe a un'altra domanda. *(PR 9, in revisione)*

**L'immagine da anteprima si genera solo quando c'è il dominio.** Prima si
generava comunque, con l'argomento che alla PR 16 non ci fosse niente da
ricordarsi — e il costo si vedeva in `dist/`: un JPEG per serata che nessuna
pagina referenziava, cioè ottantuno ridimensionamenti e ottantuno file morti in
ogni deployment con l'archivio pieno. La promessa regge lo stesso: arriva il
dominio e arrivano le immagini, perché è la stessa condizione che fa emettere
`og:image` al layout. *(PR 9, in revisione)*

**Senza JavaScript, `/81` si apre in cima all'archivio.** Il salto alla scena
giusta è lo script, e qui pesa più che su `/`, perché l'indirizzo aveva promesso
una serata precisa. Un redirect a `/#serata-81` funzionerebbe per il browser e
romperebbe la ragione per cui la rotta esiste: lo scraper che costruisce
l'anteprima segue i redirect e leggerebbe i meta della radice. Accettata e
scritta; il programma resta tutto lì da scorrere. *(PR 9)*

## La prenotazione

**Il numero pubblicato è `+39 335 665 4599`, dato dal committente il 14 agosto
2026**, ed è quello del presidente dell'associazione, che ha scelto lui di
pubblicarlo in questo modo. Scritto qui perché non sta scritto in nessun altro
posto che duri: nei file di design c'è solo il segnaposto, e chi legge il
repository fra un anno trova dieci cifre senza provenienza — e dieci cifre senza
provenienza in un bottone che manda messaggi a qualcuno sono esattamente ciò che
nessuna guardia può verificare. *(PR 12)*

**Il numero sta in un modulo puro, `src/lib/contact.ts`, e i link li costruisce
lui.** È configurazione, non contenuto: una seconda copia scritta a mano in un
componente non è sbagliata il giorno che la si scrive — è giusta, ed è per
questo che la si scrive — è sbagliata il giorno che il numero cambia e ne segue
una sola. Fra i due momenti non fallisce niente e non si vede niente: un link
`wa.me` ben formato apre una chat con uno sconosciuto, e la pagina intorno è
perfetta. Una guardia sul sorgente vieta `wa.me` e quelle cifre in ogni altro
file di `src/`. *(PR 12)*

**Non in una collection.** Le quattro collection sono l'archivio delle serate,
non la rubrica, e il CMS della PR 14 governa quelle. Se un giorno il numero deve
poterlo cambiare chi non scrive codice, è una file collection di Sveltia e si
decide lì: con il modulo già isolato è una riga. *(PR 12)*

**Il modulo rifiuta un numero che non riconosce invece di scriverlo.** Senza il
prefisso internazionale, `wa.me/3356654599` è un indirizzo valido che raggiunge
chi possiede quelle cifre sotto un altro prefisso, o nessuno. Non fallisce da
nessun'altra parte — il link si costruisce, il markup è valido, il bottone si
preme — quindi la build è l'ultimo posto che può dirlo. Stesso ragionamento del
colore di un ciclo che non è un esadecimale a sei cifre. *(PR 12)*

**Il messaggio precompilato nomina la serata.** Le serate prenotabili sono due
o tre alla volta, e «vorrei prenotare» senza data è una domanda che il
presidente deve rifare. Quello che il messaggio *non* porta è il nome e quante
persone: li chiede il pannello, e un messaggio con dei puntini al posto del nome
è un modulo travestito da conversazione. *(PR 12)*

**Quindi il testo della prenotazione diventa uno per serata, dentro la scena.**
Era un `<template>` unico per tutto il programma finché il pannello diceva la
stessa cosa a ogni serata; da qui contiene il link, e il link nomina la serata.
L'alternativa era tenere il template unico e far riscrivere l'`href` allo script
da un attributo `data-`: è il modale che **costruisce** contenuto dai dati
invece di clonarlo — la cosa che la PR 7 ha deciso di non fare — e un indirizzo
scritto da uno script è un indirizzo che non esiste per chi quello script non lo
esegue. Le serate future sono due o tre, non ottantuno. *(PR 12)*

**Il bottone porta due forme e il CSS sceglie quella che funziona.** Il bottone
`only-js` che apre il pannello, e accanto un `<a href>` con classe `no-js-only`
che va dritto a WhatsApp: la stessa coppia che la PR 7 ha scritto per il bottone
e la lista dei materiali. Copre anche il browser sotto la soglia, quello senza
`<dialog>`, perché `Modal.astro` si rimette `no-js` da sé e lì il link riappare
senza che nessuno debba ricordarsene. *(PR 12)*

**Senza script si perde la spiegazione, non l'azione.** Il link parte con il
messaggio già scritto; i sessanta posti e la risposta in serata restano nel
`<template>`, che chi non ha script non apre. È lo stesso confine della PR 7 —
il testo della prenotazione non è contenuto della pagina, i link di una serata
sì — e sta scritto qui invece di essere scoperto. *(PR 12)*

**Le due metà dell'interruttore `no-js` portano `!important`.** Non è una gara
di specificità vinta di misura: quella regola non è stile, è «per questo lettore
quell'elemento non esiste», e deve battere qualunque cosa un componente dichiari
sul proprio `display`. Scritta senza, funzionava a metà dalla PR 7: `.no-js
.only-js` sono due classi, come il `.button[data-astro-cid-…]` in cui si compila
uno stile di componente, e il pareggio lo decideva l'ordine dei fogli. Con gli
script spenti la serata 78 pubblicava un «Rivedi la serata» morto sopra la lista
che avrebbe dovuto sostituire. Trovato aprendo il sito costruito, non leggendo
`global.css`, dove le due righe sono simmetriche — ed è per questo che la
guardia legge `dist/`. *(PR 12)*

**Le due guardie leggono i numeri come li scrive una persona.** `+39 300 000
0000` e `393000000000` sono lo stesso numero, e un controllo che ne conoscesse
una sola scrittura sarebbe soddisfatto dall'altra. Quello che si rifiutano di
chiamare numero è una sequenza a gruppi di una cifra: `M 3 0 0 0 0 0 0 0 0 0` in
un path SVG è dieci cifre e nove separatori, e una guardia che segnala un disegno
è una guardia che qualcuno spegne. *(PR 12)*

## Le pagine istituzionali e la navigazione

**La navigazione sta nel layout**, accanto a `CycleAccents` e `ClipShapes`, per
il criterio già scritto alla PR 5: nel layout ci sta ciò che, dimenticato, non
fa fallire niente. Una pagina senza navigazione si legge benissimo e non porta
da nessuna parte. *(PR 13)*

**Le voci sono `<a href>`, non bottoni.** Nell'export sono `<button onClick>`
perché lì le viste sono stati di un componente; da noi sono pagine vere, e
l'elemento per una cosa che porta a un'altra pagina è il link — con l'indirizzo
condivisibile, il tasto centrale, l'apri-in-nuova-scheda, l'annuncio da screen
reader e una navigazione che funziona con gli script spenti. È la regola 14
applicata alla seconda rotaia del sito. *(PR 13)*

**L'indicatore scorrevole diventa `aria-current="page"`.** Nel design è uno
`<span>` posizionato in pixel misurati da JavaScript a ogni `resize`; a schermo
la stessa cosa la fa una regola CSS, e così è anche *detta* invece che solo
disegnata. Si perde l'animazione fra due voci, che in un sito di pagine vere non
esiste: fra la voce vecchia e la nuova c'è un caricamento. *(PR 13)*

**La tendina del telefono è `<details>/<summary>`.** Porta apertura, chiusura,
fuoco, Invio e l'annuncio *espanso/compresso* senza una riga di script. Quello
che la tendina del design ha e questa no è la chiusura al clic fuori, che è un
handler: costa un tocco e risparmia del codice che alla PR 17 andrebbe tarato.
*(PR 13)*

**L'elenco delle voci è reso due volte, ed è impaginazione e non due sorgenti.**
Sopra i 900px è la riga del design desktop, sotto è la tendina; una delle due è
sempre `display: none`, quindi nell'albero di accessibilità e nell'ordine di
tabulazione ce n'è esattamente una. Tutt'e due vengono da `NAVIGATION`, quindi
non possono divergere — ed è per questo che le marcature `aria-current="page"`
pubblicate sono due e il test lo pretende. La strada senza duplicazione era una
sola, `<details>` con il pannello forzato aperto sul desktop, e non regge: i
browser nascondono i figli di un `<details>` chiuso in un modo che il CSS
d'autore non raggiunge — su Safari 15.4, che è la soglia dichiarata, il menu
sarebbe una riga vuota. *(PR 13)*

**«Rassegna stampa» non è un link e non ha una pagina.** Un `<a>` senza `href`
non è un link: non prende il fuoco, ha il ruolo generico e non l'annuncio di un
link, e in un menu è una voce che sembra attiva e non lo è — la stessa mezza
verità dell'`aria-disabled` su un `<a>` senza indirizzo, tolta alla PR 6. È
testo, con accanto il suo *in arrivo*. E niente pagina: sarebbe un indirizzo
condivisibile e indicizzabile per qualcosa che non ha niente da dire, più una
rotta che la sitemap della PR 16 dovrebbe ricordarsi di escludere. *(PR 13)*

**Ogni link interno pubblicato deve trovare la sua pagina in `dist/`**,
`checkInternalLinks`: la sorella di `checkEveningRoutes`, e il motivo per cui la
decisione qui sopra non ha bisogno di una guardia sua — il giorno che qualcuno
dà un `href` a quella voce, quella pagina non c'è e la suite lo dice. *(PR 13)*

**L'indirizzo si compone in un posto solo**, `src/lib/venues.ts`. La collection
teneva l'indirizzo da sempre; quello che veniva scritto a mano era la
*scrittura*, e alla PR 12 erano già due — `Scene.astro` con la città,
`componenti.astro` senza. Nessuna delle due è sbagliata, ed è questo il punto:
sono due risposte alla stessa domanda, e chi le vede tutte e due vede un sito che
non è sicuro di dove sta. *(PR 13)*

**E gli indirizzi del design non compaiono da nessuna parte**, `checkStaleVenue`,
sul sorgente e sul pubblicato. *Circolo di via Fratelli Rosselli 12* è scritto
cinque volte in `design-export/`, che è la specifica da cui si traduce: il modo
in cui arriva in produzione è qualcuno che ne copia la riga, esattamente come il
numero segnaposto. *(PR 13)*

**Il segnaposto telefonico del design non si pubblica.** `011 000 0000` è un
numero di Torino ben formato: chiamarlo raggiunge qualcuno che non è
l'associazione, o nessuno, e la pagina attorno è perfetta. L'associazione non ha
un fisso da pubblicare, quindi la pagina contatti offre le due porte che
esistono. La guardia c'era già ed è parametrica: le si passa la seconda costante.
*(PR 13)*

**L'email sta accanto al numero, e si pubblica marcata come segnaposto.**
`ciao@laminieraculturale.it` è la decisione già presa in
[questioni-aperte.md](questioni-aperte.md) — arriva col dominio — ma la casella
non esiste ancora, e un `mailto:` che non riceve è il segnaposto telefonico con
una chiocciola. La via che funziona oggi è WhatsApp, e la pagina lo dice.
*(PR 13)*

**I testi che l'associazione non ha ancora scritto sono segnaposto palesi.** Nel
design ci sono una storia di fondazione, quattro persone con nome e ruolo e
quattro statistiche: nessuna di quelle cose appartiene a questa associazione.
Pubblicate così sono una pagina che rende perfettamente, dice il falso e non
fallisce da nessuna parte — e nessuno rilegge una pagina che sembra finita. Un
lorem ipsum, un `Nome Cognome` e uno `0000` si vedono a colpo d'occhio, ed è per
questo che sono stati scelti: la variante credibile è quella che resta
pubblicata. *(PR 13)*

**E stanno in un modulo solo, si dichiarano nel markup e non sopravvivono al
dominio.** `src/lib/placeholder.ts` li tiene tutti — «tutti» è la proprietà che
rende la sostituzione un file solo invece di una caccia — il componente
`Placeholder` mette insieme la cornice che il lettore vede e il
`data-placeholder` che la guardia legge, e con `site` impostato in
`astro.config.mjs` un solo blocco marcato in `dist/` è una violazione. È
l'interruttore di `og:url`, armato dalla configurazione e non dalla memoria di
qualcuno: **la PR 16 non chiude finché i testi veri non ci sono**, ed è voluto —
un dominio vero con un lorem ipsum sopra è l'unica cosa peggiore di non avere il
dominio. *(PR 13)*

**Il 3:1 dei cicli implica il 4,5:1 sull'inchiostro, su questo fondo, e la
verifica resta scritta.** La voce corrente scrive nero sull'accento, e una parola
vuole 4,5 dove un bordo vuole 3: sembrava la scoperta della PR 6 — il 3:1
verificato contro il fondo della pagina mentre `EventCard` disegnava l'accento su
`--surface-raised` — e invece qui i conti dicono un'altra cosa. Passare 3:1
contro `#003049` mette un colore sopra 0,179 di luminanza relativa, e sopra 0,175
si è già oltre 4,5:1 contro il nero: i sei colori del repository stanno fra 5,89
e 8,43. La seconda verifica **non può fallire oggi**, e resta perché una delle sue
due premesse è un token: chi domani mette `--text-on-accent: var(--blue-900)` —
il «nero più morbido», la cosa ovvia da fare — porta diversi accenti sotto la
soglia in una pagina dove non cambia nient'altro. L'inchiostro si legge dai
token, risolvendo il `var()` con cui è dichiarato. *(PR 13)*

**La pillola non mangia lo scorrimento.** Un riquadro fisso sopra lo scroller
viene colpito per primo, e una rotellina sopra di esso cerca un antenato
scorrevole suo — trovando il documento, alto una schermata e fermo. È la trappola
che la Timeline ha già pagato, e la risposta è la sua: `pointer-events: none`
sull'involucro **e sulla pillola**, e `auto` restituito alle cose che si premono
— il marchio, le voci, il riassunto, il pannello. Spegnerlo sul solo involucro
non basta e la revisione l'ha detto: la pillola è a sua volta un riquadro fisso,
e sul telefono è larga quanto lo schermo — una fascia di 54 pixel in cima al
programma dove il dito non scorre. Provato sul costruito, prima e dopo: nel vuoto
fra due voci adesso il colpo di rotella raggiunge la scena. *(PR 13)*

**I `clamp()` delle due pagine nuove sono in `rem`.** La PR 17 esiste anche per
togliere i px da quelli delle scene, copiati dal design: un `clamp()` che non
dipende in nessuno dei suoi termini dal corpo di base non dà niente a chi
ingrandisce il testo dal sistema, e il pubblico di questo sito ha cinquanta e
sessant'anni. Quelli scritti qui non devono essere sistemati due volte. *(PR 13)*

## Il CMS

**Il bundle di Sveltia lo serviamo noi, e non sta in git.** Tre strade, due
scartate. Un CDN è fuori per la ragione dei caratteri — il sito non dipende da
nessun altro — e per una che vale solo qui: quel JavaScript riceve i permessi di
scrittura sul repository, quindi quali byte siano lo deve decidere
`package-lock.json` e non ciò che unpkg risponde quel giorno. Committarlo è
fuori perché sono 1,9 MB di minificato altrui, e git non dimentica: ogni
aggiornamento resterebbe nella storia per sempre, che è il ragionamento già
scritto in [contenuti.md](contenuti.md) per le fotografie. Lo copia
`npm run cms:sync` dentro `dev` e `build`, ed è gitignorato. Quello che si perde
committando — la garanzia che i byte serviti siano quelli riletti — si ricompra
con un test che li confronta con quelli installati, come la favicon con il suo
disegno. *(PR 14)*

**`@sveltia/cms` passa fra le `dependencies`.** La build adesso ne ha bisogno
davvero. Lasciarlo fra le `devDependencies` sarebbe la mezza verità dei
`@fontsource` della PR 1 vista dall'altro lato: quelli sono di sviluppo perché i
woff2 sono committati, questo no. *(PR 14)*

**L'accesso è con token personale, e l'OAuth arriva col dominio.**
L'authorization code flow ha bisogno di un'origine registrata su GitHub e di un
relay che tenga il segreto, e l'origine non esiste finché il sito non è
pubblicato. `auth_methods: [token]` dichiara una via sola invece di lasciare
acceso un bottone che finisce sull'endpoint di Netlify e fallisce lì. È anche
l'unico punto in cui «un redattore senza sapere che esiste git» non è ancora
vero, ed è la fase a un redattore solo già decisa qui sotto. *(PR 14)*

**Il fuso si dichiara nel CMS.** `input_timezone: Europe/Rome`,
`output_utc: false`, `format: YYYY-MM-DDTHH:mm:ssZ`. Senza, il campo scrive il
fuso del browser: a Torino d'estate esce `+02:00` per caso e non per costruzione,
e chi compila da altrove scrive l'offset sbagliato su una serata che si svolge a
Torino. È il quarto posto in cui la regola 11 si perde e il primo in cui si
perde senza che nessuno scriva codice — e rende vera la frase che
[contenuti.md](contenuti.md) stampava dalla PR 3. *(PR 14)*

**Niente campo corpo, e i corpi escono dai file.** Nessuna pagina rende il
`body` di un'entry. Offrire il campo vuol dire un posto in cui si scrive testo
che non compare da nessuna parte; non offrirlo lasciando i corpi nei file vuol
dire un salvataggio dal CMS che li cancella senza dirlo. Il giorno che un corpo
avrà dove andare diventa un campo dello schema, con il suo campo nel form
accanto. *(PR 14)*

**Il nome del file lo decide il modello di slug del CMS**, quindi `81.md` e non
`081.md`. Sveltia non ha un filtro che imbottisce di zeri: l'alternativa era due
convenzioni nella stessa cartella dal primo giorno, quelle scritte a mano
imbottite e quelle del CMS no. I cinque file d'esempio sono stati rinominati, e
una guardia pretende che ogni file di `src/content/` si chiami come lo
chiamerebbe il CMS. *(PR 14)*

**Le immagini si ridimensionano nel browser, prima del commit**: 1600px sul lato
lungo, 800×800 i ritratti, webp all'85%. È il secondo dei due punti di controllo
di [contenuti.md](contenuti.md) e l'unico che vale a regime. webp perché il file
che entra nel repository è comunque una copia — gli originali stanno fuori — e
`astro:assets` lo ricodifica lo stesso. Una guardia pretende che ogni campo
immagine finisca su una trasformazione con un tetto su **tutt'e due** i lati: la
libreria di un campo sostituisce quella globale invece di aggiungersi, quindi un
campo che dichiara la sua e dimentica le misure resta senza limite sotto una
regola globale che dice che ce n'è uno. *(PR 14)*

**Le etichette sono italiane, la scocca del CMS è in inglese.** Sveltia ha
diciassette traduzioni e nessuna italiana. Le etichette e gli aiuti dei campi
sono nostri e seguono la regola sulla lingua; «Save» e i menù sono suoi. Non è
un compromesso nascosto: sta scritto qui e in [architettura.md](architettura.md)
perché non sia una sorpresa al primo accesso. *(PR 14)*

**Il redattore ha un'eccezione sulla protezione di `main`.** Il CMS commetta
direttamente su `main` via API, e `main` pretende una pull request con
`enforce_admins` acceso: un salvataggio da `/admin` verrebbe rifiutato, e il
redattore leggerebbe un errore di git in un form che esiste per non fargli sapere
che git c'è. La strada scelta è **«bypass pull request allowances» per il solo
account che usa il CMS**: le modifiche al codice continuano a passare da una PR,
i contenuti no. Quel che si perde è che un contenuto rotto si vede dopo la
pubblicazione invece che prima — la CI gira anche sul push a `main`, quindi si
vede comunque. L'alternativa era far scrivere Sveltia su un branch `contenuti` e
portarlo su `main` con una PR: nessuna eccezione, ma il redattore salva e non
pubblica, e qualcuno deve fondere. Si applica nelle impostazioni del repository e
si verifica alla PR 16. *(deciso alla PR 14, applicato alla PR 16)*

**Il `config.yml` si convalida anche contro lo schema JSON di Sveltia**, che il
pacchetto pubblica e che quindi è quello della versione fissata dal lockfile.
Tutte le guardie qui sopra confrontano i nostri due file fra loro, e leggono le
chiavi che *noi* scriviamo: un `input_timzone` scritto male verrebbe controllato
sotto il nome sbagliato, trovato e approvato, mentre Sveltia — che quella chiave
non l'ha mai vista — torna al fuso del browser. La terza parte dell'accordo è il
CMS, e l'unica cosa che parla per lui è il suo schema, che dichiara
`additionalProperties: false` quasi dappertutto. Costa una dipendenza di
sviluppo, `ajv`. *(PR 14)*

**I facoltativi vuoti non si scrivono, e non c'è anteprima.**
`omit_empty_optional_fields: true`, perché `attendance: ''` non è un numero e
Zod ha ragione a fermare la build. `editor.preview: false`, perché l'anteprima
di Sveltia è una resa generica dei campi e questo sito è uno scroller a schermo
pieno con lo snap e un accento per ciclo: un'anteprima che non gli somiglia è
una promessa che il sito non mantiene. Quella vera è il deploy preview della
PR 16. *(PR 14)*

## La suite veloce

**L'accecamento avviene in memoria, non riscrivendo i file.** Fino alla PR 14
`test:mutate` iniettava `return []` nel file su disco, faceva girare la suite e
rimetteva il file com'era. Funzionava, e tutto ciò che di sgradevole aveva
seguiva da un fatto solo: per qualche secondo il repository non era quello che
chi ci lavora crede che sia. Da lì la marcatura nei file accecati, gli handler
dei segnali, il ripristino nel `finally` e la rilettura finale — apparato per
rendere sicuro un metodo pericoloso. E imponeva la sequenza: due accecamenti
insieme si sarebbero pestati lo stesso file. Adesso la sostituzione la fa un
plugin di Vite mentre il modulo viene caricato: niente sul disco cambia, niente
da rimettere a posto, niente da riconoscere dopo un Ctrl-C, e sessantacinque
corse possono andare in parallelo. *(PR 15)*

**La suite continua a girare intera per ogni accecamento.** Far girare «solo i
test che nominano quella guardia» dimezzerebbe il tempo e risponderebbe alla
domanda che questo strumento è nato per rifiutare: conta cosa i test tengono, non
come sono scritti. Il tempo si è preso da un'altra parte — dal parallelismo, che
non cambia la domanda. *(PR 15)*

**In CI le guardie si dividono a fette, e l'unione si verifica.** Un runner ha
quattro vCPU, quindi il parallelismo dentro un job ha un tetto basso: le fette
girano su job diversi. Il prezzo è che nessun job vede più la risposta intera, e
una fetta che non parte è indistinguibile da una che non aveva niente da fare —
cioè il «18 su 18» che questo strumento esiste per non stampare, salito di un
piano dentro la configurazione della CI. Perciò ogni fetta dichiara le guardie
che ha accecato e un passo finale somma: una guardia coperta due volte, o
nessuna, è rossa. *(PR 15)*

## Rimandate

**Il dominio.** Se ne riparla a sito finito. Il design presuppone
`laminieraculturale.it`.

**I limiti di Cloudflare Pages.** Si misura alla prima build con le foto vere,
invece di riprogettare su una stima.

**La delega a redattori senza competenze informatiche.** In fase 1 il CMS lo
usa una persona sola. Sveltia supporta più metodi di autenticazione con
GitHub, e l'authorization code flow è raccomandato proprio per utenti non
tecnici — le ore che erano state messe a budget per un giro con Cloudflare
Access probabilmente non servono. Si sceglie a ottobre, con dati veri.

## Corrette in corsa

Vale la pena tenerne traccia, perché mostrano dove è facile sbagliare.

**Lo scroller non va spezzato per Safari vecchio.** Era stata proposta una
finestra di serate più un archivio separato, per via di `content-visibility`
che su Safari arriva solo dalla versione 18. Sbagliato: `content-visibility` è
un miglioramento progressivo puro, non serve alcun ramo di codice, e il costo
residuo su iOS 17 è un peggioramento e non un blocco. Un peggioramento era
stato trattato come un blocco.

**La Timeline sta a destra, non a sinistra.** Nel design desktop è a destra e
la sezione ha un padding destro largo apposta; spostarla a sinistra avrebbe
richiesto di invertire anche le colonne.
