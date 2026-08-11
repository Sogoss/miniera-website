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
| Navigazione | voci orizzontali con indicatore scorrevole | pillola con tendina | responsive, come da design |
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
| `/81` | la singola serata, numero editoriale nudo |
| `/chi-siamo` | manifesto, come nasce, valori, persone, sede |
| `/contatti` | contatti |
| `/rassegna` | **disabilitata**, "Coming soon" |

Il numero nudo e non uno slug: le anteprime su WhatsApp e Facebook mostrano
titolo e foto grazie ai meta Open Graph, non allo slug, quindi uno slug
allungherebbe l'URL senza guadagno.

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
inline: `f-quadrifoglio`, `f-esafoglio`, `f-ottofoglio`, `f-gemma`,
`f-obliqua` sul desktop, `m-ottofoglio` sul mobile. Il riferimento è per `id`,
quindi le definizioni vanno incluse una volta in ogni pagina che le usa —
attenzione ora che le viste sono pagine separate.

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

A regime questi cinque sono solo i valori predefiniti: il colore di ogni ciclo
arriva dalla collection `cicli`.

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
