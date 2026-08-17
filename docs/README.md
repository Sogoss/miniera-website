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
git clone https://github.com/miniera-culturale/website.git
cd website
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
- Il layout di base: lingua, meta e anteprime social, salta-a, e le forme
  di ritaglio del design — una pagina non si scrive più il documento da sé
- Gli otto componenti del design system, in `.astro` e senza React, con la loro
  rassegna a `/componenti`; le forme di ritaglio non sono più copiate ma
  generate, ispirate a Material 3
- Lo scroller del programma: una scena per serata, che si apre sulla prima
  ancora da fare — la pagina di verifica provvisoria non c'è più
- La Timeline: una tacca per serata, rotaia a destra e barra in basso sul
  telefono, con la navigazione da tastiera e l'accento che segue la serata a
  schermo. Le tacche sono link veri, quindi funzionano anche senza script
- Ogni serata ha il suo indirizzo, `/81`, che è il programma aperto su quella
  serata e ne porta i meta per le anteprime; l'indirizzo segue chi scorre
- Dalla rotaia si raggiunge qualunque serata in un tocco: le lontane sono
  marchi senza data sul desktop, e sul telefono la barra scorre
- La prenotazione arriva a destinazione: «Prenota il posto» apre il pannello che
  spiega come si fa e porta il link a WhatsApp, con il messaggio già scritto e
  la serata dentro. Il numero sta in un posto solo, e con gli script spenti il
  bottone è direttamente quel link
- Il sito ha più di una pagina, e un modo per raggiungerle: la navigazione a
  pillola su ogni pagina — voci che sono link, la corrente marcata, la tendina
  del telefono che si apre senza script — più `/chi-siamo` e `/contatti`.
  «Rassegna stampa» è annunciata e non è un link, perché non c'è una pagina a
  cui puntare. L'indirizzo della sede viene dalla collection e si scrive in un
  modo solo, in ogni punto del sito
- **I testi delle due pagine nuove sono segnaposto palesi** — lorem ipsum,
  `Nome Cognome`, cifre a `0000` — in attesa di quelli dell'associazione: stanno
  in un modulo solo, sono marcati sulla pagina e in `dist/`, e diventano un test
  rosso il giorno che il sito prende un dominio. Vedi
  [questioni-aperte.md](questioni-aperte.md)
- Il CMS a `/admin`: le quattro collection con i loro campi, etichette in
  italiano, le immagini ridimensionate nel browser prima del commit e la data
  che porta l'ora italiana ovunque si trovi chi compila. Il form e lo schema Zod
  non possono più divergere — sette guardie leggono l'uno contro l'altro — e il
  bundle di Sveltia lo serviamo noi senza tenerlo in git. Si entra con un token
  personale di GitHub: l'accesso col bottone arriva col dominio, vedi
  [questioni-aperte.md](questioni-aperte.md)

- La suite è più veloce di tre volte e mezzo: `npm run test:mutate` — che acceca
  ogni guardia a turno per vedere se la suite se ne accorge — è passato da 6m30s
  a 1m58s, e l'accecamento avviene in memoria invece che riscrivendo i file, così
  una corsa interrotta non lascia niente da rimettere a posto
- **Il sito è in linea**, su `pages.dev`: un commit su `main` pubblica, ogni PR
  ha il suo preview, e un rebuild notturno dopo la mezzanotte italiana fa passare
  una serata da *in programma* a *già svolta*. Con la 404, un `robots.txt` che
  vieta l'indicizzazione finché il dominio non c'è, e i security header con una
  CSP i cui hash si calcolano da `dist/` invece di essere scritti a mano. Il
  repository è pubblico, in un'organizzazione, e `main` sta su due ruleset —
  quello che dà il bypass al CMS non dà il force push
- **La misura del testo si scrive in `rem`**: i `clamp()` delle scene avevano i
  limiti in px, copiati dal design, e chi ingrandisce il testo dal sistema non
  otteneva niente. È la regola 23, con la sua guardia sui due strati, e il
  pannello del modale ha smesso di misurarsi sul viewport grande

Da fare: l'elenco completo dei passi, in ordine e uno per PR, sta in
[piano.md](piano.md). In sintesi — un controllo qualità a mano su dispositivi e
impostazioni veri, e per ultimo il dominio, che è il solo passo che aspetta il
committente. La migrazione delle 81 serate storiche resta fuori dalla beta, vedi
[questioni-aperte.md](questioni-aperte.md).

Lo scroller del programma è `src/components/Programme.astro`, e le rotte che lo
usano sono `src/pages/index.astro` e `src/pages/[number].astro`. Ogni scena porta
quattro attributi che i test leggono in `dist/` — `data-number`, `data-state`,
`data-open`, `data-cycle` — e che vanno riportati se la scena viene rifatta;
`<html>` porta l'accento della serata a schermo, e l'indirizzo il suo numero.
