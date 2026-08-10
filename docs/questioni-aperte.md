# Questioni aperte

Aggiornato al 10 agosto 2026. Chiudendo una voce, spostala in
[decisioni.md](decisioni.md) con il motivo.

## Blocca la stima

### In che formato arrivano le 81 serate storiche

È l'incognita più grande del progetto, ed è ancora aperta. La differenza fra
le ipotesi è di venti ore e passa:

| Formato di consegna | Costo stimato |
|---|---|
| Foglio di calcolo strutturato | 4–8 h — script di import |
| Vecchio sito o pagina Facebook | 10–15 h — scraping e pulizia |
| Cartelle di foto e ricordi | 20–30 h — inserimento manuale |

Va chiarito con l'associazione. La mitigazione già concordata è separare
**"sito funzionante"** da **"sito popolato"**: la beta può avere dieci serate
di esempio, e il caricamento dello storico è inserimento dati, non
ingegneria — può slittare e può essere delegato all'associazione stessa una
volta che il CMS gira.

Adesso che il modello dati è definito, la domanda si può porre in modo
preciso: per ogni serata servono numero, titolo, data e ora, ciclo, formato,
descrizione, sede, relatori con ruolo, foto tema, presenze, eventuali link
alle registrazioni.

Da chiarire anche: **le serate storiche hanno un link video ciascuna?** Nei
file di design puntano tutti al canale YouTube generico e non al singolo
video. Se il link per serata esiste è una colonna in più nella migrazione.

## Da decidere prima della migrazione delle foto

### Dove finiscono gli originali non compressi

Le foto entrano nel repository ridimensionate (1600px lato lungo per le
locandine, 800×800 per i ritratti). Gli originali vanno tenuti **fuori** — un
disco, il drive dell'associazione — perché il ridimensionamento non è
reversibile e prima o poi qualcuno vorrà stampare la foto di una serata.

Non è ancora stato deciso dove.

## Minori

### Link a mappa per le sedi

Lo schema di `sedi` ha un campo `mappa` facoltativo. Non è stato deciso se
usarlo, né se una mappa serva davvero nella pagina contatti.

### Numero WhatsApp reale

Nei file di design è il segnaposto `+39 300 000 0000`. Quello vero è del
presidente dell'associazione, che ha scelto lui di pubblicarlo in questo modo.
Va sostituito prima della pubblicazione.

### Indirizzo email

`ciao@laminieraculturale.it` resta com'è nel design, anche se la casella non
esiste ancora. Si sistema insieme al dominio.

### Rassegna stampa

Resta disabilitata nella navigazione, come "Coming soon". Se e quando diventi
una pagina vera non è deciso.

## Rimandate consapevolmente

Queste hanno già una decisione — *"se ne riparla dopo"* — e stanno qui solo
perché non vadano dimenticate.

- **Dominio e casella di posta**: a sito finito
- **Limiti di Cloudflare Pages**: si misura alla prima build con le foto vere
- **Delega a redattori non tecnici**: si sceglie a ottobre, in fase 1 il CMS
  lo usa una persona sola
- **Prestazioni dello scroller con tutte le serate**: si misura su un telefono
  vero, non in emulazione
