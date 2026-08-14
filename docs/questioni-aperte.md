# Questioni aperte

Aggiornato al 14 agosto 2026. Chiudendo una voce, spostala in
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

## Blocca la PR 15

### I testi, i numeri e le persone delle pagine istituzionali

**Aperta il 14 agosto 2026, alla PR 13.** `/chi-siamo` e `/contatti` hanno la
struttura del design e non i suoi testi: quello che l'export scrive lì è una
storia di fondazione, quattro persone con nome e ruolo e quattro statistiche,
e nessuna di quelle cose appartiene a questa associazione. Al loro posto ci sono
segnaposto **palesi** — lorem ipsum, `Nome Cognome`, cifre a `0000` e `9999` —
scelti così perché un segnaposto credibile è una pagina che rende perfettamente,
dice il falso e non fallisce da nessuna parte.

Serve dal committente, in una volta sola:

- il manifesto e il testo di «come nasce»;
- i tre valori, con i loro titoli;
- il direttivo: nomi, ruoli e, se ci sono, i ritratti;
- gli orari di apertura e come si arriva;
- i numeri, con la data a cui sono aggiornati;
- le due fotografie: la sala e l'ingresso — o una mappa.

**E blocca la pubblicazione, per costruzione.** Con `site` impostato in
`astro.config.mjs` un solo blocco `data-placeholder` in `dist/` è una
violazione: la PR 15 non può chiudere finché questa voce è aperta. È voluto e
sta scritto qui perché allora non sia una sorpresa — un dominio vero con un
lorem ipsum sopra è l'unica cosa peggiore di non avere il dominio. Se il
committente decidesse di pubblicare comunque, la strada è togliere le sezioni
che non hanno testo, non togliere il marcatore.

## Da fare alla PR 15

### L'anteprima di un link su WhatsApp e su Facebook

Rimandata dalla PR 9, che è la PR in cui gli indirizzi delle serate esistono e i
meta li portano. Senza dominio non c'è niente da incollare in una chat, e
`og:image` il layout non lo emette affatto: deve essere assoluto, e assoluto lo
può essere solo con `site` in configurazione. Il test è già scritto e si arma da
solo quando quella riga compare.

Da provare, allora: che l'anteprima esca con titolo, descrizione e figura, e che
la figura sia quella della serata e non la stessa per tutte.

### La prova su un telefono vero

Rimandata dalla PR 7, e non perché non conti: è la prova che regge la decisione
`svh` invece di `dvh`, cioè che lo snap non salti quando la barra degli
indirizzi di Safari si ritrae. Chi lavora al progetto non ha un iPhone, e i due
modi di provarlo adesso — un tunnel verso il server di sviluppo, un servizio con
device remoti — costano più attenzione di quanta ne valga finché non c'è un URL
stabile: alla PR 15 il sito è pubblicato e lo apre chiunque, da qualunque
telefono.

Quello che intanto regge il rischio è costruttivo e non una speranza: l'altezza
delle scene è `--scene-height`, cioè `svh` con il ripiego a `vh` in `@supports`,
e ogni scena dichiara la propria altezza intrinseca — che è ciò che tiene ferme
le posizioni di snap e rende esatto il salto di apertura. Il residuo è che la
posizione iniziale cada di poco fuori posto, che è visibile e correggibile.

Da provare, in ordine: che lo snap non salti mentre la barra si ritrae; che
l'apertura cada esattamente sulla prima serata futura; che lo scorrimento
morbido di una tacca della Timeline arrivi a destinazione senza essere
interrotto dallo snap — rimandato qui dalla PR 8, per lo stesso motivo e con lo
stesso rischio retto per costruzione: il salto è quello nativo del browser sul
frammento, non uno `scrollTo` scritto da noi.

## Da decidere prima della PR 15

### L'immagine delle anteprime social

Il layout emette `og:image` solo se la pagina gliene passa una, e nessuna lo fa:
oggi un link condiviso su WhatsApp mostra titolo e descrizione, senza figura.
Le pagine serata della PR 9 avranno la foto tema, ma **il sito ha bisogno anche
di un'immagine predefinita** per la home e per le pagine istituzionali.

Va scelta, non generata a caso: il marchio su fondo blu è la strada ovvia, nel
formato 1200×630 che le anteprime si aspettano. È una decisione di contenuto e
di design, quindi non la prende una guardia — e per questo la suite **non**
pretende `og:image` quando arriva il dominio: pretenderlo avrebbe aperto la
PR 15 su un test rosso che si poteva chiudere solo inventando l'immagine.
Quello che la suite pretende è che, se una pagina ne pubblica una, sia assoluta.

## Minori

### Le due immagini segnaposto

`src/assets/photos/` contiene due immagini **generate**, non fotografie:
servono a far vedere funzionare la colonna dell'immagine e il caricamento
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

### Il `<title>` di una serata, e `og:type`

Due mezze scelte sui meta, rimandate insieme perché si guardano meglio con dei
contenuti veri davanti.

Il titolo di una rotta serata è `Serata 81 — Chi tiene aperto il quartiere`,
mentre quello della radice porta anche il nome dell'associazione. Nei risultati
di ricerca è il posto dove quel nome lavorerebbe di più; in una linguetta,
ripetuto su ottantuno pagine, è rumore. **Deciso di rivederlo quando si
inseriscono i contenuti veri**, che è quando si vede come suonano ottantuno
titoli di fila.

`og:type` resta `website` anche sulle rotte delle serate, che sono
semanticamente degli eventi. Sta in `Base.astro`, cioè nel layout condiviso, e
il posto dove si tocca è la PR 15 insieme al resto dei meta.

### Link a mappa per le sedi

Lo schema di `sedi` ha un campo `map` facoltativo. Non è stato deciso se
usarlo, né se una mappa serva davvero nella pagina contatti.

Alla PR 13 quella pagina è uscita senza: l'indirizzo è un fatto e una mappa è
un'immagine da scegliere, e il posto dove la si guarderebbe — la cornice vuota
in fondo a `/chi-siamo` — è già segnato. Il campo continua a non essere letto da
nessuno.

### Indirizzo email

`ciao@laminieraculturale.it` resta com'è nel design, anche se la casella non
esiste ancora. Si sistema insieme al dominio.

**Alla PR 13 è entrata nella pagina contatti, marcata come segnaposto**, con
accanto la frase che dice come stanno le cose: la casella arriva col dominio e
intanto la via che funziona è WhatsApp. Sta in `src/lib/contact.ts` accanto al
numero, e i link li costruisce `mailtoLink()`. Finché la casella non esiste, un
`mailto:` che non riceve è il segnaposto telefonico con una chiocciola — e la
regola 20 impedisce che resti così il giorno che il sito ha un dominio.

### Rassegna stampa

**Deciso alla PR 13: è una voce di navigazione e non una pagina.** Compare fra
le quattro voci con il suo *in arrivo*, come testo e non come link — un `<a>`
senza indirizzo non è un link, e una pagina «Coming soon» sarebbe un indirizzo
condivisibile e indicizzabile per qualcosa che non ha niente da dire, più una
rotta che la sitemap della PR 15 dovrebbe ricordarsi di escludere.

Resta aperto se e quando diventi una pagina vera. Il giorno che succede, la voce
prende un `href` in `src/lib/navigation.ts` e nient'altro cambia — e finché quel
giorno non arriva, `checkInternalLinks` è quello che impedisce di dargliene uno
in anticipo.

## Rimandate consapevolmente

Queste hanno già una decisione — *"se ne riparla dopo"* — e stanno qui solo
perché non vadano dimenticate.

- **Dominio e casella di posta**: a sito finito
- **Limiti di Cloudflare Pages**: si misura alla prima build con le foto vere
- **Delega a redattori non tecnici**: si sceglie a ottobre, in fase 1 il CMS
  lo usa una persona sola
- **Prestazioni dello scroller con tutte le serate**: si misura su un telefono
  vero, non in emulazione
