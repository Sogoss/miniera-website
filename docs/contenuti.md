# Contenuti

Lo schema vive in [`src/content.config.ts`](../src/content.config.ts). Questo
documento spiega il perché delle scelte, che nel codice sta stretto.

## Quattro collection

```
src/content/
  eventi/     una serata
  cicli/      l'etichetta editoriale a cui una serata appartiene
  sedi/       dove si tiene
  relatori/   chi interviene
```

I **nomi delle collection restano in italiano**, contro la regola sulla lingua
del [CLAUDE.md](../CLAUDE.md) e per una ragione dichiarata: sono l'unico pezzo
di codice che si trova davanti chi redige i contenuti senza scrivere codice. I
**campi dentro quei file sono in inglese** — `number`, `title`, `date`,
`speakers` — perché nessuno li incontra: nel CMS ogni campo porta la sua
etichetta italiana. L'unica eccezione sono i valori di `format`, che restano
`incontro`, `proiezione`, `presentazione`: quelli arrivano al lettore.

Cicli, sedi e relatori sono collection separate — e non campi di testo dentro
l'evento — per una ragione sola: **i loro valori si ripetono**. Un relatore
torna più volte; tenerlo dentro l'evento significherebbe ricaricare la stessa
foto a ogni partecipazione e vedere il ruolo divergere fra una serata e
l'altra. Un indirizzo riscritto ottanta volte a mano è un indirizzo sbagliato
almeno una volta.

## Quello che non è un campo, ed è voluto

| Non c'è | Perché |
|---|---|
| passato / futuro | si calcolano da `date` alla build |
| una data breve ("20 mar") | è una formattazione di `date` |
| la data distesa ("giovedì 20 marzo, ore 21") | idem |
| il nome del ciclo | viene dal riferimento al ciclo |
| `soloAudio` | **eliminato**: nel design era un bottone senza URL, quell'audio non esiste |

Nei file di design la data era testo libero e senza anno. Non va replicato:
tutto tipizzato, il redattore inserisce una data vera e il sito genera le
stringhe.

## Regole editoriali

### Il numero è l'URL, e non si tocca mai più

Ogni serata ha un numero editoriale che l'associazione già usa: alla data di
questa documentazione sono arrivati a **81**. Quel numero è l'URL pubblico
(`/81`).

- Si assegna **alla programmazione**, non a serata avvenuta.
- **Non va mai riassegnato.** Un link già condiviso punterebbe a una serata
  diversa da quella che qualcuno ha mandato in chat.
- Non va **derivato dall'ordine cronologico**: il giorno che salta fuori una
  serata dimenticata si rinumererebbe tutto.
- Una serata **annullata conserva numero e pagina**, con il campo `cancelled`.
  Chi aveva già condiviso `/82` non deve trovarci un 404. Il numero resta
  bruciato, che è corretto: quella programmazione è esistita.

Se due eventi finissero con lo stesso numero la build fallisce da sola, perché
due rotte reclamerebbero lo stesso percorso. È una rete di sicurezza, non un
controllo da aggiungere.

### Quando una serata diventa "già svolta"

Alla **mezzanotte del giorno successivo**, non all'ora di inizio: una serata
che comincia alle 21 di giovedì resta "in programma" mentre è in corso.

Il calcolo avviene alla build, quindi dipende dal rebuild notturno — vedi
[architettura.md](architettura.md).

### I cicli sono etichette, non periodi

Più cicli possono essere aperti in contemporanea, e due serate consecutive
possono appartenere a cicli diversi. Non hanno date di inizio e fine.

Ogni ciclo porta il proprio colore, che diventa `--accent`. I cinque colori
predefiniti del design sono tarati a luminosità e saturazione uguali apposta,
perché nessun ciclo prevalga sugli altri e il contrasto sul fondo blu resti
garantito: **discostarsene molto rompe quella taratura.**

### Il ruolo di un relatore

Il ruolo predefinito sta sulla persona. Il singolo evento può sovrascriverlo,
perché un ruolo cambia nel tempo e in una serata del 2025 va mostrato quello
di allora:

```yaml
speakers:
  - person: amina-belhaj                      # usa "educatrice"
  - person: piergiorgio-rosso
    role: presidente del comitato di quartiere # solo per questa serata
```

Due volte la stessa persona non si può: è il modo in cui ci si sbaglia quando
si cerca dove sovrascrivere un ruolo, ed era il caso della serata 81. Lo
segnala una guardia — Zod non lo vede, perché due riferimenti identici sono
due riferimenti validi.

### Interventi

Registrazioni e materiali collegati. Di solito al massimo tre, ma **non c'è un
tetto** e il campo è deliberatamente generico: oggi sono link YouTube, domani
può essere un Vimeo o un articolo.

## Immagini

Una foto tema per serata — la locandina se è futura, uno scatto in sala se è
passata — più una foto per relatore. I relatori si ripetono, quindi la loro
foto sta sulla persona e si carica una volta sola.

### Il vincolo che conta: git non dimentica

Una foto da 4 MB committata una volta **resta nella storia del repository per
sempre**, anche se il giorno dopo la sostituisci. Toglierla richiede
riscrivere la storia. Quindi la barriera deve esistere *prima* che entrino le
foto, non dopo.

Due punti di controllo, servono entrambi:

1. **Migrazione, una tantum.** Uno script con sharp che processa la cartella
   delle foto originali prima del primo commit.
2. **CMS, a regime.** Sveltia ridimensiona al caricamento, così il redattore
   non può committare un file enorme nemmeno volendo.

Tetti proposti:

| | Dimensione massima |
|---|---|
| Foto tema | 1600px sul lato lungo |
| Ritratto relatore | 800 × 800 |

Con questi numeri: 81 locandine più una cinquantina di ritratti fanno circa
**20 MB** di sorgenti nel repository. GitHub avvisa a 50 MB *per singolo file*
e blocca a 100 MB, e raccomanda di stare sotto 1 GB di repository. Siamo due
ordini di grandezza sotto soglia: niente `git-lfs`.

Le varianti webp e avif le genera `astro:assets` alla build e finiscono in
`dist/`, non nel repository.

**Gli originali non compressi vanno tenuti fuori dal repository** — un disco,
il drive dell'associazione. Una volta ridimensionato a 1600px non si torna
indietro, e prima o poi qualcuno vorrà stampare la foto di una serata. Dove
finiscano è ancora da decidere: vedi
[questioni-aperte.md](questioni-aperte.md).

## La sede

Sono più d'una, ma quella prevalente è **Palazzo ex Venchi Unica, Piazza
Massaua 17/b, Torino**.

Attenzione leggendo i file di design: l'indirizzo vi compare in **tre versioni
diverse e incoerenti** (`Via Fratelli Rosselli 12`, `Circolo di via Fratelli
Rosselli 12`, e quello sopra). Quello sopra è il buono.

## Prenotazioni

Non c'è un backend e non serve: il bottone "Prenota il posto" apre un modale
che spiega come si fa e rimanda a WhatsApp con un link `wa.me`.

Il numero è quello del **presidente dell'associazione**, che ha scelto lui di
pubblicarlo in questo modo. Nei file di design è ancora il segnaposto
`+39 300 000 0000`.
