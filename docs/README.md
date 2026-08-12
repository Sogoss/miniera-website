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
| [piano.md](piano.md) | Come si lavora, e i passi da fare in ordine: una PR ciascuno |
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

Serve Node 24, fissata in `.nvmrc`. Non serve nient'altro: niente database, niente
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
- Impianto di verifica: guardie ai vincoli, due strati di test, CI su ogni PR
- Codice portato all'inglese — token, campi, commenti — con i nomi delle
  collection lasciati in italiano di proposito, e favicon dal marchio
- Utilità di dominio: ordine, confine fra passato e futuro in `Europe/Rome`,
  date in italiano, ruoli, note, scena di apertura
- L'accento di ogni serata viene dal colore del suo ciclo, emesso alla build
  dalla collection: `colors.css` non decide più il colore di nessuno

Da fare: l'elenco completo dei passi, in ordine e uno per PR, sta in
[piano.md](piano.md). In sintesi — il layout di base, i componenti del design
system, lo scroller con la `Timeline`, le pagine delle serate, il CMS, la
pubblicazione. La migrazione delle 81 serate storiche resta
fuori dalla beta, vedi [questioni-aperte.md](questioni-aperte.md).

`src/pages/index.astro` è una pagina di verifica provvisoria: serve solo a
dimostrare che token, caratteri e collection funzionano insieme. Va sostituita
dallo scroller vero.
