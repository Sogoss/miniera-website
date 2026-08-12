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

## Da fare alla PR 13

### La prova su un telefono vero

Rimandata dalla PR 7, e non perché non conti: è la prova che regge la decisione
`svh` invece di `dvh`, cioè che lo snap non salti quando la barra degli
indirizzi di Safari si ritrae. Chi lavora al progetto non ha un iPhone, e i due
modi di provarlo adesso — un tunnel verso il server di sviluppo, un servizio con
device remoti — costano più attenzione di quanta ne valga finché non c'è un URL
stabile: alla PR 13 il sito è pubblicato e lo apre chiunque, da qualunque
telefono.

Quello che intanto regge il rischio è costruttivo e non una speranza: l'altezza
delle scene è `--scene-height`, cioè `svh` con il ripiego a `vh` in `@supports`,
e ogni scena dichiara la propria altezza intrinseca — che è ciò che tiene ferme
le posizioni di snap e rende esatto il salto di apertura. Il residuo è che la
posizione iniziale cada di poco fuori posto, che è visibile e correggibile.

Da provare, in ordine: che lo snap non salti mentre la barra si ritrae; che
l'apertura cada esattamente sulla prima serata futura; che lo scorrimento
morbido della Timeline arrivi a destinazione senza essere interrotto — quello è
della PR 8.

## Da decidere prima della PR 13

### L'immagine delle anteprime social

Il layout emette `og:image` solo se la pagina gliene passa una, e nessuna lo fa:
oggi un link condiviso su WhatsApp mostra titolo e descrizione, senza figura.
Le pagine serata della PR 9 avranno la foto tema, ma **il sito ha bisogno anche
di un'immagine predefinita** per la home e per le pagine istituzionali.

Va scelta, non generata a caso: il marchio su fondo blu è la strada ovvia, nel
formato 1200×630 che le anteprime si aspettano. È una decisione di contenuto e
di design, quindi non la prende una guardia — e per questo la suite **non**
pretende `og:image` quando arriva il dominio: pretenderlo avrebbe aperto la
PR 13 su un test rosso che si poteva chiudere solo inventando l'immagine.
Quello che la suite pretende è che, se una pagina ne pubblica una, sia assoluta.

## Minori

### Le due locandine segnaposto

`src/assets/locandine/` contiene due immagini **generate**, non fotografie:
servono a far vedere funzionare la colonna della locandina e il caricamento
pigro, e lo dicono di sé stesse — c'è scritto «immagine segnaposto» sopra. Sono
assegnate alle serate 78 e 81, con un commento nel frontmatter.

Escono quando arrivano le foto vere dell'associazione, che è parte della
migrazione dell'archivio qui sopra. Non c'è niente da decidere: c'è da
ricordarsene.

### Un ritratto vero da mettere davanti alle forme

Chiusa a metà, e la metà che resta è di contenuto. La geometria delle forme è
decisa — ricostruita, vedi [decisioni.md](decisioni.md) — ma **nessun relatore
d'esempio ha una foto**, quindi il ritaglio a 56×56 si è giudicato su un
riquadro di prova e su una foto messa in locale, non su un ritratto del vero
archivio. Non blocca niente: il campo `photo` è nello schema da sempre, e la
prima foto che arriva dal CMS passa dal ritaglio senza che si tocchi nulla.
Vale la pena riguardare le forme quando ci saranno i ritratti veri.

### Link a mappa per le sedi

Lo schema di `sedi` ha un campo `map` facoltativo. Non è stato deciso se
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
