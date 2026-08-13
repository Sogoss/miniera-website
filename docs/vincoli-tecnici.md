# Vincoli tecnici

## Il pubblico

Età media 50–60 anni, molti smartphone e non tutti recenti. Il sito deve
funzionare su telefoni di qualche anno fa.

Questo è il vincolo da cui discendono quasi tutte le decisioni di questa
pagina.

## Soglia dei browser

Dopo aver eliminato `color-mix()` e `oklch()` dai token, il vincolo più
stringente rimasto è `svh` — **Safari 15.4, marzo 2022**.

Il punto importante non è la data, è la natura del degrado. Prima della
conversione dei token, sotto Safari 16.2 il sito non peggiorava: diventava
**illeggibile**, perché i colori del testo (`--text-secondary`,
`--text-muted`, `--border-hairline`) erano costruiti con `color-mix`. Ora
sotto soglia degrada e basta.

Cosa resta di relativamente recente:

| Funzionalità | Se manca |
|---|---|
| `svh` | ripiego a `vh` dichiarato in `@supports` |
| `aspect-ratio` | Safari 15, sotto serve un ripiego se emerge |
| `text-wrap: pretty` | non succede niente, è solo estetica |
| `backdrop-filter` | va scritto anche col prefisso `-webkit-` |
| `content-visibility` | vedi sotto: è un miglioramento progressivo |

## ⚠️ I ripieghi vanno scritti con `@supports`

Il minificatore CSS **collassa le doppie dichiarazioni**. Questo:

```css
:root {
  --scene-height: 100vh;    /* ripiego */
  --scene-height: 100svh;
}
```

nel CSS pubblicato diventa solo `--scene-height:100svh`. Il ripiego sparisce
silenziosamente e non te ne accorgi guardando il sorgente: bisogna guardare il
file in `dist/`.

Va scritto così:

```css
:root { --scene-height: 100vh; }

@supports (height: 100svh) {
  :root { --scene-height: 100svh; }
}
```

**Vale per ogni ripiego, non solo per questo.** Ed è verificato: è successo
davvero durante l'implementazione dei token.

## ⚠️ La soglia va detta anche al minificatore

Scoperto alla PR 7, e il difetto è della stessa famiglia del ripiego collassato:
il sorgente è giusto e il file pubblicato no.

Senza target di build dichiarati, il minificatore riscrive

```css
@media (max-width: 900px) { … }
```

come `@media (width <= 900px)` — la **sintassi range**, che i browser capiscono
da **Safari 16.4**. La soglia di questo progetto è 15.4, quella di `svh`: fra le
due versioni la media query non si applica affatto, quindi un iPhone riceve il
layout desktop a due colonne su uno schermo da 390 px. Nessun errore da nessuna
parte, e nel sorgente c'è scritto esattamente quello che deve esserci.

I target stanno in `astro.config.mjs`, `vite.build.cssTarget` e
`vite.build.target`, e la guardia `checkMediaRangeSyntax` legge il CSS
pubblicato: se qualcuno toglie i target, se ne accorge la suite e non un
visitatore con un telefono del 2022.

## `svh`, non `dvh`

Il design usa `100dvh`. Non va replicato.

Con `dvh`, quando la barra degli indirizzi di Safari si ritrae l'altezza del
viewport cambia, le sezioni cambiano altezza e — con `scroll-snap-type:
mandatory` — la posizione salta. È visibile e fastidioso.

Con `svh` l'altezza resta stabile, al prezzo di una striscia scoperta quando
la barra è ritratta. È il compromesso giusto per uno scroller a snap.

Il token è `--scene-height` in `src/styles/tokens/spacing.css`.

## Prestazioni dello scroller

Il programma tiene **tutte** le serate in un solo documento — 81 oggi, una in
più a settimana. Niente virtualizzazione: renderizzare solo una finestra in
JavaScript romperebbe SEO, Ctrl+F e la barra di scorrimento, e costringerebbe
a gestire a mano le posizioni di snap.

Tre strati, in ordine di efficacia:

**1. `loading="lazy"` sulle immagini.** Funziona ovunque da anni ed è dove sta
il grosso del costo, soprattutto su rete lenta. Solo le prime una o due
sezioni caricano subito.

**2. `content-visibility: auto` con `contain-intrinsic-size`.** Il browser
salta stile, layout e paint di tutto ciò che è fuori schermo. Gli snap point
restano al posto giusto perché l'altezza intrinseca è dichiarata — e nel
nostro caso è banale, ogni sezione è alta esattamente un viewport.

> `content-visibility` è arrivato su Safari solo con la **versione 18**
> (settembre 2024). Su iOS 17 e precedenti la dichiarazione viene ignorata.
>
> **Non serve fare niente per questo.** È un miglioramento progressivo puro:
> nessun `@supports`, nessun ramo di codice, nessuna navigazione alternativa.
> Chi ce l'ha ne beneficia, chi non ce l'ha renderizza tutto — con le immagini
> comunque in lazy, il costo residuo è layout e style recalc di markup
> semplice. Un peggioramento, non un blocco.

**3. Il peso dell'HTML.** Circa 2,5 KB per sezione: 81 sezioni fanno ~200 KB
di markup, che compresso sta sui 20–25 KB. Accettabile. Diventerà una domanda
vera verso le 300 serate, cioè fra qualche anno — e allora si deciderà con
numeri veri.

C'è un dettaglio a favore: il design apre sulla prima serata **futura**, cioè
in fondo allo storico. Con l'altezza intrinseca dichiarata il salto iniziale
è esatto e istantaneo.

**Da misurare su un telefono vero** quando ci saranno tutte le serate, non in
emulazione.

## `scroll-snap` e scorrimento morbido su iOS

`scrollTo({ behavior: 'smooth' })` combinato con `scroll-snap-type: mandatory`
è storicamente instabile su Safari: lo snap interrompe lo scorrimento morbido.

**E non solo su Safari.** Alla PR 9 lo si è riprodotto in Chrome, e non a
intermittenza: un salto animato interrotto da un secondo salto viene lasciato
cadere, e la pagina resta sulla prima destinazione mentre tutto il resto — la
rotaia, l'accento, l'indirizzo — dice la seconda. Lo scorrimento morbido è stato
tolto: raggiungeva solo i salti fatti da script, che sono gli unici che questo
sito compie, quindi comprava un'animazione al prezzo della loro correttezza.

Il design se n'era già accorto — nel suo codice c'è una guardia con un flag
`bersaglio` e un timer da 1200 ms. È replicata dalla PR 8, con un compito
spostato: il salto da una tacca lo fa il browser sul frammento, e la guardia
serve a impedire che `aria-current`, l'accento e la finestra di tacche
lampeggino attraverso le serate attraversate. Resta da provare su un iPhone
vero, e la prova è rimandata alla PR 13 —
[questioni-aperte.md](questioni-aperte.md).

## Movimento ridotto

Lo strato base dell'export azzerava animazioni e transizioni sotto
`prefers-reduced-motion`, ma **lasciava attivi scroll-snap e scorrimento
morbido** — che sono esattamente le due cose che danno fastidio a chi soffre
di motion sickness.

In `src/styles/global.css` sono azzerati anche quelli: per quegli utenti lo
scroller diventa una lista che si scorre normalmente.

## Struttura dei titoli

Nel design ogni sezione-serata ha il titolo in `<h1>`: in una pagina sola
sarebbero 81 `<h1>`, male per la SEO e confuso per gli screen reader.

Nello scroller i titoli delle serate sono `<h2>`, con un unico `<h1>` di
pagina. Visivamente non cambia niente, è solo il tag. Nelle pagine `/81` il
titolo della serata è invece legittimamente `<h1>`.

## Accessibilità

Non è un requisito formale — l'associazione non riceve fondi pubblici che lo
impongano — ma il sito va reso il più accessibile possibile.

Perimetro concordato:

- Navigazione da tastiera esplicita sullo scroller: frecce, PagSu/PagGiù,
  Home/Fine. Esplicita perché i motori non concordano: Chrome e Firefox
  rispondono alle frecce su un contenitore scorrevole a colpi di pixel e non di
  serata, Safari non risponde finché il fuoco non è dentro
- Link "salta al programma"
- `aria-current` sulla tacca attiva della Timeline
- Messa a fuoco visibile (è già nei token: `:focus-visible` con riga
  d'accento, mai trasparenze vetrose)
- `prefers-reduced-motion` come sopra

La mitigazione più forte però è strutturale: **ogni serata ha il suo
indirizzo.** `/81` è il programma aperto sull'ottantunesima — non un documento
diverso — e chi non riesce a usare lo scroll-snap ha comunque tutto il contenuto
in pagina: con gli script spenti si scorre normalmente, e sotto
`prefers-reduced-motion` lo snap si spegne. È questo che rende il pattern
difendibile.

Attenzione all'`overflow` annidato del design — ogni sezione è a sua volta
scrollabile dentro lo scroller — che rende ambigua la navigazione da tastiera
e da screen reader.

## Limiti di Cloudflare Pages

Piano gratuito: 500 build al mese, tetto di file per deployment, 25 MiB per
file. `astro:assets` moltiplica i file generando più larghezze e formati per
immagine.

Con ~130 immagini sorgente si resta sotto soglia, ma non di infinito.
**Deciso di misurare alla prima build con le foto vere** invece di
riprogettare adesso su una stima.
