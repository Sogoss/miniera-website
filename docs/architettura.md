# Architettura

## Il principio

Niente backend, niente database, niente server di casa nel percorso critico.
Il repository è il backup; i commit sono lo storico delle modifiche.

Era stata valutata e scartata un'alternativa con Strapi e PostgreSQL su k3d
self-hosted dietro un tunnel Cloudflare. Costava circa il doppio in ore e
aggiungeva una dipendenza permanente dall'uptime di un server domestico, per
un sito che cambia una volta a settimana.

## Il flusso

```
Redattore  →  /admin  (Sveltia CMS, JavaScript statico nel browser)
                 ↓  commit via API di GitHub
              repository:  src/content/**/*.md
                 ↓  webhook
              Cloudflare Pages:  build Astro  →  sito statico su CDN
```

Il redattore vede un form e non sa che esiste git. Ogni salvataggio è un
commit, ogni commit fa partire una build, la build pubblica.

### Come sta insieme, in pratica

`public/admin/` contiene due file scritti da noi — `index.html`, che è solo un
`<script>` e un `noindex`, e `config.yml`, che è la redazione intera — e un
terzo che nessuno scrive: il bundle di Sveltia, copiato da `node_modules` da
`npm run cms:sync` (lo eseguono `npm run dev` e `npm run build`) e tenuto fuori
da git. Non arriva da un CDN perché il sito non dipende da nessun altro, e
perché quel JavaScript ha i permessi di scrittura sul repository: quali byte
siano lo decide `package-lock.json`, e un test dello strato `build` confronta
quelli pubblicati con quelli installati.

`config.yml` e `src/content.config.ts` dicono la stessa cosa a due lettori
diversi, e a tenerli d'accordo non c'è la buona volontà ma sette guardie: vedi
la regola 21 del [CLAUDE.md](../CLAUDE.md).

**L'accesso, oggi, è con un token personale di GitHub** — `auth_methods:
[token]`. Il bottone «Sign in with GitHub», che è la via per chi non sa cos'è un
token, ha bisogno di un'applicazione OAuth registrata su un'origine e di un
relay che ne tenga il segreto: l'origine è il sito pubblicato, quindi arriva con
il dominio alla PR 16.

**L'interfaccia del CMS è in inglese**: Sveltia ha diciassette traduzioni e
nessuna italiana. Italiane sono le etichette e gli aiuti dei campi, che sono
nostri.

## Stack

| Ruolo | Scelta | Versione |
|---|---|---|
| Framework | Astro, generazione statica | 7.2 |
| Immagini | `astro:assets` con sharp | 0.35 |
| Stile | token CSS del design system, **niente Tailwind** | — |
| Caratteri | self-hostati da `@fontsource` | — |
| CMS | Sveltia CMS, backend GitHub | 0.184 |
| Hosting | Cloudflare Pages, piano gratuito | — |
| CLI hosting | wrangler | 4.120 |

Node 22.12 o superiore.

### Perché niente Tailwind

Il design system che arriva da Claude Design è già un sistema di token
completo in CSS puro: custom properties per colori, tipografia, spaziature ed
effetti. Aggiungere Tailwind avrebbe significato mantenere per sempre uno
strato di traduzione fra due vocabolari che dicono la stessa cosa — e ogni
futuro aggiornamento del design sarebbe arrivato in CSS puro, da ritradurre a
mano ogni volta.

Il prezzo pagato: si scrive più CSS a mano per i layout. È poco, perché il
design è fatto di stili puntuali e non di composizione a utility.

### Perché Cloudflare Pages e non Workers

Cloudflare oggi indirizza i progetti nuovi verso Workers con static assets,
perché unifica frontend e backend in un solo deploy. Ma Pages resta pienamente
supportato, e per un sito puramente statico pubblicato con un git push è la
strada più semplice. Se un domani servisse logica dinamica si migra: non è una
scelta che chiude porte.

## Repository

`https://github.com/Sogoss/miniera-website` — privato, branch predefinito
`main`.

Cartelle:

```
design-export/     export di Claude Design, versionato come specifica
docs/              questa documentazione
public/admin/      il CMS: la shell e il config.yml; il bundle lo copia la build
scripts/           utilità di manutenzione (caratteri, favicon, bundle del CMS)
src/assets/fonts/  i woff2 self-hostati e le loro licenze
src/content/       i contenuti: eventi, cicli, sedi, relatori
src/styles/        i token del design e lo strato base
```

`design-export/` non entra nella build — non sta né in `src/` né in `public/`
— ma resta versionata perché *è* la specifica del sito. Vedi
[design.md](design.md).

## Build e pubblicazione

```bash
npm run dev          # sviluppo
npm run build        # build statica in dist/
npm run preview      # anteprima della build
npm run fonts:sync   # ricopia i caratteri dai pacchetti @fontsource
npm run cms:sync     # ricopia il bundle di Sveltia in public/admin/
```

### Quando si ricostruisce il sito

Due inneschi, entrambi necessari:

1. **A ogni commit.** È il comportamento predefinito di Cloudflare Pages
   collegato a GitHub. Copre le modifiche fatte dal CMS.
2. **Ogni notte alle 03:00, ora italiana.** Perché un sito statico non sa che
   ora è: se un evento è passato, e su quale evento si apre lo scroller, sono
   informazioni calcolate al momento della build. Senza il rebuild notturno
   una serata resterebbe "in programma" all'infinito.

Il piano gratuito di Cloudflare Pages consente 500 build al mese. Un rebuild
al giorno ne consuma trenta: resta ampio margine per i commit del CMS.

## Dominio

Non ancora acquistato — deciso di occuparsene a sito finito. Il design
presuppone `laminieraculturale.it` (l'indirizzo email nella pagina contatti è
`ciao@laminieraculturale.it`). Quando il dominio esiste va impostato `site`
in `astro.config.mjs`: serve agli URL canonici, alla sitemap e soprattutto ai
meta Open Graph delle pagine evento, che sono il motivo per cui quelle pagine
esistono.

Per la casella di posta, Cloudflare Email Routing inoltra gratuitamente a un
indirizzo esistente ed evita di pagare un servizio mail dedicato.
