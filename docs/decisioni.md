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
una funzione con il suo test invece che una riga dentro una pagina. La
pubblicano l'attributo `data-state`, lo scroller della PR 7 per la scena
barrata e la PR 9 per la pagina della serata — tutti e tre devono fare la
stessa domanda. *(PR 3, in revisione)*

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

**La pill non è una forma di ritaglio, e cercarla fra i `clipPath` non ha
senso.** Il design la usa sette volte e sempre come
`border-radius: var(--radius-pill)`. Non potrebbe essere un ritaglio: sotto
`objectBoundingBox` i raggi sono frazioni di larghezza e altezza, quindi si
deformano con il rapporto d'aspetto e `rx=.5 ry=.5` dà un'ellisse, non una
capsula. Sta scritto in [design.md](design.md) accanto alle forme, perché è lì
che qualcuno andrà a cercarla. *(PR 5, in revisione)*

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
a `og:url` avrebbe aperto la PR 13 su una suite rossa che si poteva chiudere
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
