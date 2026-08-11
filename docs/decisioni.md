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
`[data-tema="carta"]` lo fa già, e la PR 4 emetterà un `--accento` per ciclo.
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
documentazione e messaggi di commit in italiano. Il codice già scritto va
migrato — vedi PR 2 in [piano.md](piano.md).

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
