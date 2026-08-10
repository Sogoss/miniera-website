# Documentazione — La Miniera Culturale in Periferia

Sito vetrina dell'associazione culturale *La Miniera Culturale in Periferia*:
il programma degli eventi, passati e futuri, in ordine cronologico.
Cadenza settimanale, circa 52 serate l'anno. Alla data di questa
documentazione l'associazione è alla serata numero **81**.

Questa cartella è la memoria del progetto. Contiene le decisioni prese, il
perché di ognuna, e i vincoli che non vanno riscoperti da capo. È scritta per
essere letta da chi riprende il lavoro dopo settimane — o da un'altra
macchina, o da un altro collaboratore.

## Indice

| Documento | Cosa contiene |
|---|---|
| [architettura.md](architettura.md) | Stack, flusso di pubblicazione, hosting, build e rebuild |
| [design.md](design.md) | I due file di design, la convergenza, il design system e i token |
| [contenuti.md](contenuti.md) | Modello dati, le quattro collection, regole editoriali |
| [vincoli-tecnici.md](vincoli-tecnici.md) | Soglia browser, prestazioni dello scroller, accessibilità, immagini |
| [decisioni.md](decisioni.md) | Registro compatto delle decisioni, con il motivo di ciascuna |
| [questioni-aperte.md](questioni-aperte.md) | Cosa resta da decidere, e chi deve decidere |

Le convenzioni operative per chi lavora al codice — comprese le tre o quattro
regole che è facile violare senza accorgersene — stanno in
[../CLAUDE.md](../CLAUDE.md).

## Riprendere il lavoro su una macchina nuova

```bash
git clone https://github.com/Sogoss/miniera-website.git
cd miniera-website
npm install
npm run dev
```

Serve Node 22.12 o superiore. Non serve nient'altro: niente database, niente
servizi da avviare, niente variabili d'ambiente. Il repository *è* il
progetto — contenuti, immagini, storico delle modifiche e specifica di
design inclusi.

## Stato attuale

Fatto:

- Scaffold Astro, dipendenze, repository privato su GitHub
- Export del design scaricato in `design-export/` e tenuto versionato
- Token del design portati in `src/styles/`, senza `color-mix()` né `oklch()`
- Caratteri self-hostati (Archivo, Archivo Black, IBM Plex Mono)
- Schema tipizzato delle quattro collection, con un esempio ciascuna

Da fare, nell'ordine in cui conviene affrontarlo:

1. Gli otto componenti del design system portati da React a `.astro`
2. Lo scroller del programma con la `Timeline`
3. Le pagine dei singoli eventi
4. Le pagine `chi-siamo` e `contatti`, e la `rassegna` disabilitata
5. Sveltia CMS: configurazione e autenticazione
6. Collegamento a Cloudflare Pages e rebuild notturno
7. Migrazione delle 81 serate storiche — *fuori dalla beta, vedi
   [questioni-aperte.md](questioni-aperte.md)*

`src/pages/index.astro` è una pagina di verifica provvisoria: serve solo a
dimostrare che token, caratteri e collection funzionano insieme. Va sostituita
dallo scroller vero.
