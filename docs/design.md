# Design

## Da dove viene

Il sito è stato disegnato con Claude Design. L'export completo del progetto è
in `design-export/`, versionato: è la specifica, e va consultata prima di
implementare qualsiasi schermata.

```
design-export/
  sito-miniera.dc.html         il design desktop
  sito-miniera-mobile.dc.html  il design mobile
  CLAUDE.md                    le regole di progetto del design (leggilo)
  _ds/…/tokens/*.css           i token originali
  _ds/…/_ds_bundle.js          gli 8 componenti, in React
  _ds/…/_ds_bundle.css         lo strato base del documento
  support.js, image-slot.js    runtime di anteprima di Claude Design
  uploads/*.png                immagini di riferimento incollate in chat
```

Due file di `uploads/` non è stato possibile scaricarli: superano il limite di
256 KiB dell'API di lettura. Sono screenshot incollati in conversazione, non
asset del sito. Se servissero, vanno presi dall'interfaccia di Claude Design.

## Cosa NON si spedisce

I file `.dc.html` contengono il runtime di anteprima di Claude Design:
`<x-dc>`, `<sc-for>`, `<sc-if>`, `<x-import>`, `<image-slot>`, la classe
`DCLogic`, `support.js`. **Niente di tutto questo va in produzione.** Sono la
specifica da tradurre, non codice da riusare. `support.js` e `image-slot.js`
stanno nel repository solo perché servono a far girare l'anteprima in locale.

## I due design sono due siti, non uno responsive

Studiati separatamente, differiscono per scelte e non per breakpoint.
**Decisione: convergono in un solo sito responsive.** Ecco come, punto per
punto.

| | Desktop | Mobile | Deciso |
|---|---|---|---|
| Timeline | verticale a destra | orizzontale in basso | **entrambe**, secondo la larghezza |
| Divisore "oggi" | presente | assente | **si elimina** |
| Navigazione | voci orizzontali con indicatore scorrevole | pillola con tendina | **entrambe**, secondo la larghezza — e senza script: vedi qui sotto |
| Layout scena | due colonne (testo \| foto) | una colonna, foto in alto | responsive, come da design |
| "Prenota il posto" | apre un modale | link diretto a WhatsApp | **modale su entrambi** |
| Allineamento testo | a sinistra | centrato | **a sinistra** |
| Intestazione evento | etichetta ciclo + formato + stato, con occhiello | riga mono "Ciclo X · formato" | **come il desktop** |
| Viste | SPA in JS, l'URL non cambia | solo il programma | **pagine vere** |

Il modale resta su entrambi perché contiene informazione reale che sul mobile
andrebbe persa: *"la sala ha sessanta posti, scrivi su WhatsApp con il tuo
nome e quante persone siete, ti rispondiamo entro sera"*.

Il design desktop ha già media query fino a 900px che collassano tutto a una
colonna: sono un punto di partenza utile, ma il design mobile resta la
referenza per come si comporta il sito su schermo stretto.

## Struttura delle pagine

Le viste del design desktop, che lì erano cambi di stato in JavaScript senza
cambio di URL, diventano pagine vere:

| Percorso | Contenuto |
|---|---|
| `/` | il programma: lo scroller a scroll-snap con la Timeline |
| `/81` | il programma aperto su quella serata, numero editoriale nudo |
| `/chi-siamo` | manifesto, come nasce, valori, persone, sede |
| `/contatti` | contatti |
| `/rassegna` | **non esiste**: è una voce di navigazione, non un indirizzo |

Il numero nudo e non uno slug: le anteprime su WhatsApp e Facebook mostrano
titolo e foto grazie ai meta Open Graph, non allo slug, quindi uno slug
allungherebbe l'URL senza guadagno.

## La navigazione

Dalla PR 13, e sta in `Base.astro`: ogni pagina la porta, nessuno deve
ricordarsene. Le due forme del design convergono così.

| Nel design | Da noi | Perché |
|---|---|---|
| `<button onClick>` per voce | `<a href>` | sono pagine vere, non stati di un componente: il link porta indirizzo, tasto centrale, annuncio e funziona senza script |
| indicatore scorrevole misurato in JS | `aria-current="page"` | a schermo lo fa il CSS, e così è anche *detto* invece che solo disegnato |
| tendina con handler e overlay | `<details>/<summary>` | apre, chiude, prende il fuoco e si annuncia da sé; si perde la chiusura al clic fuori |
| «Rassegna stampa» disabilitata | testo con il suo *in arrivo* | un `<a>` senza indirizzo non è un link, e non c'è una pagina a cui puntare |

L'elenco delle voci è reso **due volte** — la riga del desktop e il pannello
della tendina — da `src/lib/navigation.ts`, e una delle due è sempre `display:
none`. È impaginazione e non due sorgenti; la strada senza duplicazione sarebbe
stata un `<details>` forzato aperto sopra i 900px, e i browser non lasciano al
CSS d'autore quella decisione.

L'accento della voce corrente è quello della serata a schermo, perché
`data-cycle` sta su `<html>`: è il comportamento del design, e qui arriva gratis.

## Lo scroller e la Timeline

> ⚠️ **Il formato a scroll-snap a schermo pieno è un requisito del
> committente.** Non è una scelta di design rinegoziabile. I problemi che
> comporta — peso di rendering, deep-link, SEO, accessibilità — si risolvono
> *dentro* il vincolo, mai proponendo di sostituirlo con una lista eventi più
> pagina di dettaglio.

Il programma è un contenitore con `scroll-snap-type: y mandatory`, in cui ogni
serata occupa una sezione alta quanto lo schermo. Si apre sulla prima serata
futura.

Il componente di navigazione laterale si chiama **`Timeline`** — nei file di
design è chiamato "binario". Verticale a destra su desktop, orizzontale in
basso su mobile, senza il divisore "oggi".

L'accento cambia a ogni serata: scorrendo, nav, Timeline e bottoni seguono il
colore del ciclo a cui la serata appartiene. È il comportamento del design e
va mantenuto anche ora che i cicli possono essere concorrenti e quindi il
colore cambia più spesso.

Per prestazioni, accessibilità e comportamento su iOS vedi
[vincoli-tecnici.md](vincoli-tecnici.md).

## Il design system

Otto componenti, in `_ds_bundle.js`, scritti in React con stili inline sui
token:

`Bottone` · `Etichetta` · `Scheda` · `Marchio` · `FasciaFirma` ·
`BadgePuntata` · `RigaOspite` · `SchedaEvento`

**Vanno portati a `.astro`, non usati come isole React.** Sono tutti
presentazionali e uno solo ha stato — `Bottone`, per l'effetto premuto,
replicabile con `:active`. Spedire React per otto componenti senza logica su
un sito vetrina statico non si giustifica.

Nel portarli cambiano nome: un componente è codice, e il codice è in inglese.

| Nell'export | Da noi |
|---|---|
| `Bottone` | `Button` |
| `Etichetta` | `Label` |
| `Scheda` | `Card` |
| `Marchio` | `Brand` |
| `FasciaFirma` | `SignatureBand` |
| `BadgePuntata` | `EpisodeBadge` |
| `RigaOspite` | `GuestRow` |
| `SchedaEvento` | `EventCard` |

### Regola del marchio

Dal `CLAUDE.md` dell'export del design, e vale sempre:

> Il marchio va **sempre** usato nella forma estesa, con la scritta "in
> Periferia". La variante breve non va mai usata, in nessuna dimensione o
> contesto, navigazione mobile inclusa: se lo spazio è poco si riduce
> l'altezza, non si taglia la firma.

### Forme di ritaglio

Il design ritaglia le foto con `clip-path` che referenziano `<clipPath>` SVG
inline. Il riferimento è per `id` e vale **solo dentro lo stesso documento**,
quindi le definizioni stanno in `src/components/ClipShapes.astro` e le include
il layout: ogni pagina le ha, nessuno deve ricordarsene, e una guardia pretende
che ogni `url(#…)` pubblicato trovi la sua forma nella stessa pagina.

Le forme distinte dell'export sono **cinque**: quella a otto lobi è definita
due volte, `f-ottofoglio` e `m-ottofoglio`, perché sono due file — un design
desktop e uno mobile — e noi facciamo un sito solo. Da noi sono **sei**: la
Pill di Material si è aggiunta alla PR 6.

I nomi sono quelli di **Material 3**: un `id` è codice, e invece di tradurre
l'italiano dell'export a orecchio prendono il nome che Google dà alle stesse
geometrie nella sua libreria di forme.

| Nell'export | Geometria | Material 3 | Il nostro `id` | Da dove viene |
|---|---|---|---|---|
| `f-quadrifoglio` | quattro lobi attorno a una croce | 4-leaf clover | `clip-clover-4` | generata |
| `f-esafoglio` | centro largo, sei lobi | 6-sided cookie | `clip-cookie-6` | generata |
| `f-ottofoglio` · `m-ottofoglio` | centro stretto, otto lobi | 8-leaf clover | `clip-clover-8` | generata |
| `f-gemma` | otto lati arrotondati | gem | `clip-gem` | generata |
| *nessuna* | capsula inclinata | pill | `clip-pill` | generata |
| `f-obliqua` | quadrilatero con due lati inclinati | *nessuna* | `clip-skewed` | **dall'export** |

`clip-pill` non viene dall'export: è la **Pill di Material 3 Expressive**,
aggiunta alla PR 6 su richiesta. Le forme sono quindi sei, cinque generate e una
— `clip-skewed` — presa dall'export.

`clip-skewed` è l'eccezione, e porta un nome descrittivo di proposito: lo `slanted`
di Material è un quadrato arrotondato su un asse inclinato, questa è un
quadrilatero a spigoli netti. Prendere in prestito quel nome avrebbe promesso
una forma diversa da quella che si ottiene — che è esattamente l'opposto del
motivo per cui i nomi vengono da Material.

> **Due cose portano il nome «pill», e sono diverse.** La pillola del design è
> `border-radius: var(--radius-pill)`, usata sette volte su bottoni ed
> etichette, e resta un raggio: non potrebbe essere un `clipPath`, perché con
> `clipPathUnits="objectBoundingBox"` i raggi sono frazioni di larghezza e
> altezza e `rx=.5 ry=.5` dà un'ellisse invece di una capsula. La **Pill di
> Material 3** è un'altra cosa: un quadrilatero arrotondato e inclinato, che si
> costruisce come le altre forme e dalla PR 6 sta fra loro, con l'`id`
> `clip-pill`. Non è un sostituto del raggio, e la sua descrizione nella
> rassegna lo dice a chi la incontra lì.
>
> Fino alla PR 6 questa nota diceva soltanto «la pill non è una forma di
> ritaglio», che era vero della pillola del design e falso della forma di
> Material — due geometrie diverse tenute insieme dal nome.

**Una sola è applicata nell'export**: quella a otto lobi, sui ritratti degli
ospiti da 56×56 — e da noi è la stessa, dentro `GuestRow`. `f-gemma` compare
come dato (`formaA`) che nessun elemento legge; le altre tre sono definite e mai
referenziate.

Da noi restano tutte, ma **non come catalogo cieco**: la rassegna a
`/componenti` le mostra tutte, grandi e a 56 pixel, e mostrarle vuol dire
pubblicarle — quindi un'asserzione pretende che ogni forma dichiarata sia
referenziata da qualche parte, e la guardia della PR 5 la risolve contro le
definizioni della stessa pagina. Erano state pubblicate per due PR senza che
nessuno potesse vederle: una geometria sbagliata sarebbe rimasta invisibile fino
al giorno in cui qualcuno avesse usato quella forma.

### La geometria: ricostruita, non copiata

Deciso alla PR 6. Cinque forme su sei sono **generate**, in
`src/lib/shapes.ts`, e non copiate da nessuna parte: né dall'export né da una
libreria. Google non pubblica i path delle sue forme — le costruisce a runtime
da un poligono arrotondato — e alla PR 5 si era già deciso che nessun pacchetto
di forme di terzi entra nel repository. Restava una strada sola: costruirle qui,
con parametri nostri, scritti accanto alla forma.

Sono quindi forme **nella maniera di** Material 3, non le forme di Material 3.
La differenza non è modestia: senza parametri pubblicati la taratura si fa a
occhio, e promettere una fedeltà che nessuno può verificare sarebbe la stessa
mezza verità che questo repository passa il tempo a cacciare.

Come sono fatte, in una riga: **un anello di lobi circolari, ognuno raccordato
al successivo da un arco concavo**. Non una stella con gli angoli arrotondati —
quella è la costruzione ovvia e non funziona, perché l'arco a un vertice non può
essere più largo del vertice, quindi o le rientranze sono profonde o le punte
sono tonde, mai tutt'e due. L'export lo sapeva e disegnava con i cerchi; qui
cambia il raccordo, che è quasi tutto quello che distingue una forma di Material
da un fiore.

I parametri di ciascuna — quanti lobi, quanto grandi, quanto raccordati — stanno
in `CLIP_SHAPES` e sono tarati sui **56×56** in cui il design le applica, che è
l'unica misura a cui la differenza fra due di queste forme sia una differenza
che qualcuno vede.

## I token

Portati da `design-export/_ds/…/tokens/` a `src/styles/tokens/`, con due
modifiche sostanziali e nessuna al disegno.

### Via `color-mix()`

Nell'export serviva quasi ovunque solo ad applicare un canale alpha a un
colore di base:

```css
/* prima */  --text-secondary: color-mix(in srgb, var(--cream-100) 68%, transparent);
/* dopo  */  --text-secondary: rgba(var(--cream-100-rgb), 0.68);
```

`rgba()` fa la stessa identica cosa ed è supportato ovunque. Il legame con il
colore di base non si perde: passa dalle terne `--cream-100-rgb`,
`--blue-700-rgb`, `--blue-900-rgb`, `--accent-rgb`.

**Se cambi un colore di base, cambia anche la sua terna.** Sono la stessa
informazione scritta due volte, e nessuno se ne accorge finché non stona
qualcosa.

L'unico caso in cui `color-mix()` guadagnava davvero qualcosa era sopra
`--accent`, che cambia col ciclo e quindi non si può precalcolare. Anche
quello è coperto: ogni ciclo porta la propria terna.

### Via `oklch()`

I cicli 2–5 erano scritti in `oklch`. Ora sono i loro equivalenti sRGB,
calcolati con rimappatura di gamut per riduzione del croma — lo stesso che fa
il browser, non un ritaglio per canale.

| Ciclo | Originale | Risultato | Nota |
|---|---|---|---|
| 1 — arancio | `#f26419` | `#f26419` | era già esadecimale |
| 2 — oro | `oklch(0.72 0.16 88)` | `#cb9e00` | **fuori dal gamut sRGB**, croma 0.16 → 0.147 |
| 3 — verde | `oklch(0.66 0.13 158)` | `#3baa73` | |
| 4 — rosso rosato | `oklch(0.65 0.17 5)` | `#e05a81` | |
| 5 — viola | `oklch(0.64 0.14 315)` | `#ac70c6` | |

Questi cinque sono la palette di riferimento, non la fonte: dalla PR 4 il
colore di ogni ciclo arriva dalla collection `cicli` e diventa una regola
`[data-cycle="N"]` emessa alla build. Nessuna regola li legge più — l'unico
ancora in uso è il primo, che è l'accento fuori da un ciclo dichiarato — e
restano scritti perché è la taratura a cui un colore nuovo deve somigliare.

### Perché conta

Le due modifiche insieme spostano la soglia dei browser da *"il sito è
illeggibile sotto Safari 16.2"* — i colori del testo erano costruiti con
`color-mix` — a *"degrada un po' sotto Safari 15.4"*. Vedi
[vincoli-tecnici.md](vincoli-tecnici.md).

### Aggiunte

- `--scene-height`, l'altezza di una sezione dello scroller
- `--veil-bar`, `--veil-bar-strong`, `--veil-modal` per le superfici
  translucide, che nel design erano `color-mix` scritti nel markup

## Caratteri

Self-hostati, niente CDN di Google: un round-trip in meno nel percorso critico
del rendering, e nessun dato dei visitatori verso terzi.

| Carattere | Uso | Licenza |
|---|---|---|
| Archivo (variabile) | testo | SIL OFL 1.1 |
| Archivo Black | display, titoli | SIL OFL 1.1 |
| IBM Plex Mono | etichette, date | SIL OFL 1.1 |

I file arrivano dai pacchetti `@fontsource`, tenuti come dipendenze di
sviluppo per provenienza, e sono copiati in `src/assets/fonts/` con
`npm run fonts:sync`. Le licenze stanno accanto ai file, come la OFL richiede.
Solo i sottoinsiemi latin e latin-ext: 227 KB in tutto, circa 66 KB caricati
da una pagina italiana grazie agli `unicode-range`.

### La trappola di Archivo Black

Archivo Black è una famiglia a peso unico, che `@fontsource` dichiara a 400.
I token però chiedono il peso 900 (`--weight-black`). Senza correzione il
browser non trova corrispondenza e applica il **grassetto sintetico**,
ingrossando e deformando i titoli rispetto al disegno.

La dichiariamo con `font-weight: 400 900`, così qualunque peso in
quell'intervallo usa i glifi veri. **Non "sistemare" quella riga.**
