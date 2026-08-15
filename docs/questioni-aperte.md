# Questioni aperte

Aggiornato al 15 agosto 2026. Chiudendo una voce, spostala in
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

## Blocca la PR 20

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
violazione: la PR 20 non può chiudere finché questa voce è aperta. È voluto e
sta scritto qui perché allora non sia una sorpresa — un dominio vero con un
lorem ipsum sopra è l'unica cosa peggiore di non avere il dominio. Se il
committente decidesse di pubblicare comunque, la strada è togliere le sezioni
che non hanno testo, non togliere il marcatore.

### Quante serate vere servono per pubblicare

**Aperta il 15 agosto 2026, alla PR 16.** Il sito ha cinque serate d'esempio, una
sede, quattro relatori e tre cicli. La mitigazione concordata su questa pagina —
*«la beta può avere dieci serate di esempio»* — non è mai diventata un passo con
un numero, una quantità e qualcuno che lo fa: è una frase in un documento, e la
differenza fra le due cose è che una frase non ferma niente.

Non è la migrazione dell'archivio, che è giustamente fuori dalla beta. È il
minimo perché pubblicare abbia senso: quante serate vere, con quali fotografie, e
se fra queste ci sia almeno una serata futura — perché lo scroller si apre sulla
prima ancora da fare, e senza nessuna serata futura si apre sull'ultima passata,
che è una pagina giusta con addosso l'aria di un sito abbandonato.

Serve dal committente insieme ai testi delle pagine istituzionali, che sono la
voce qui sopra e la stessa telefonata.

## Da fare alla PR 17

### L'eccezione sulla protezione di `main`, per il redattore

**Aperta il 14 agosto 2026, alla PR 14; la decisione è già presa** — sta in
[decisioni.md](decisioni.md) — e quel che resta è applicarla, perché sono
impostazioni del repository e non righe di codice.

Il CMS commetta direttamente su `main`, e `main` pretende una pull request con
`enforce_admins` acceso: finché resta così, un salvataggio da `/admin` viene
rifiutato e il redattore legge un errore di git dentro un form che esiste per non
fargli sapere che git c'è.

Da fare, sull'account del committente: *Settings → Branches → main → Allow
specified actors to bypass required pull requests*, con l'account che usa il CMS.
Da verificare alla PR 17: un salvataggio dal CMS arriva su `main` e fa partire la
build.

### La prova su un telefono vero

*(Alla PR 16 questa voce è passata dalla vecchia «Pubblicazione» alla PR 17,
con il resto della coda: la prova aspetta un URL stabile, e `pages.dev` ne dà
uno senza che si compri niente.)*

Rimandata dalla PR 7, e non perché non conti: è la prova che regge la decisione
`svh` invece di `dvh`, cioè che lo snap non salti quando la barra degli
indirizzi di Safari si ritrae. Chi lavora al progetto non ha un iPhone, e i due
modi di provarlo prima — un tunnel verso il server di sviluppo, un servizio con
device remoti — costavano più attenzione di quanta ne valga: alla PR 17 il sito è
in linea e lo apre chiunque, da qualunque telefono.

Quello che intanto regge il rischio è costruttivo e non una speranza: l'altezza
delle scene è `--scene-height`, cioè `svh` con il ripiego a `vh` in `@supports`,
e ogni scena dichiara la propria altezza intrinseca — che è ciò che tiene ferme
le posizioni di snap e rende esatto il salto di apertura. Il residuo è che la
posizione iniziale cada di poco fuori posto, che è visibile e correggibile.

Da provare, in ordine: che lo snap non salti mentre la barra si ritrae; che
l'apertura cada esattamente sulla prima serata futura; che il salto da una tacca
della Timeline arrivi a destinazione senza essere interrotto dallo snap —
rimandato qui dalla PR 8, per lo stesso motivo e con lo stesso rischio retto per
costruzione: il salto è quello nativo del browser sul frammento, non uno
`scrollTo` scritto da noi.

## Da fare alla PR 20

### L'accesso al CMS col bottone, invece che col token

**Aperta il 14 agosto 2026, alla PR 14.** `/admin` funziona e commetta sul
repository, ma si entra con un **token personale di GitHub**: si genera dalle
impostazioni dell'account, si incolla una volta, e da lì in poi il redattore
vede solo il form. È l'unico punto in cui l'obiettivo «senza sapere che esiste
git» non è ancora vero.

La via normale — «Sign in with GitHub» — è un authorization code flow, e ha
bisogno di due cose che alla PR 14 non esistono: un'**applicazione OAuth**
registrata su GitHub, che si registra su un'origine, e un **relay** che tenga il
segreto del client, perché una pagina statica non può tenerlo. L'origine è il
sito pubblicato. Il relay è un Worker, `sveltia-cms-auth`, che Sveltia pubblica
apposta e che sta su Cloudflare come il resto.

Serve dal committente, alla PR 20 e in una volta sola: l'applicazione OAuth
sull'account GitHub dell'associazione, e il Worker sul suo account Cloudflare.
Quello che cambia qui dentro è una riga di `public/admin/config.yml` —
`auth_methods: [oauth, token]` con il `base_url` accanto.

### L'anteprima di un link su WhatsApp e su Facebook

Rimandata dalla PR 9, che è la PR in cui gli indirizzi delle serate esistono e i
meta li portano. Senza dominio non c'è niente da incollare in una chat, e
`og:image` il layout non lo emette affatto: deve essere assoluto, e assoluto lo
può essere solo con `site` in configurazione. Il test è già scritto e si arma da
solo quando quella riga compare.

Da provare, allora: che l'anteprima esca con titolo, descrizione e figura, e che
la figura sia quella della serata e non la stessa per tutte.

## Da decidere prima della PR 20

### Se il sito misura le visite, e cosa dice a chi lo chiede

**Aperta il 15 agosto 2026, alla PR 16.** Non c'è nessuna decisione registrata
sulle statistiche, il che vuol dire che oggi il sito non ne raccoglie — ed è una
posizione difendibile, ma non è mai stata presa: è un'assenza, e un'assenza non
si difende quando qualcuno chiede *«quante persone hanno visto la serata?»*.

Le due strade non sono simmetriche. **Cloudflare Web Analytics** è gratuito, sta
sullo stesso account dell'hosting, non usa cookie e non segue una persona da un
sito all'altro: con quello, in Italia, non serve né banner né consenso.
Qualunque cosa lo faccia — Google Analytics per primo — porta con sé un banner,
un'informativa e un trasferimento di dati fuori dall'Unione, cioè tre cose che un
sito statico di quartiere non ha nessun motivo di portarsi.

Da decidere prima della PR 20, perché la seconda strada cambia la pagina e non la
configurazione. E qualunque sia la risposta, va scritta: *«non misuriamo niente»*
è una decisione, `decisioni.md` è il posto, e il giorno che qualcuno propone uno
script è quello che gli si mette davanti.

### Di chi sono il repository e il progetto Cloudflare

**Aperta il 15 agosto 2026, alla PR 16.** Il repository è `Sogoss/miniera-website`
e quella stringa è scritta nel `config.yml` del CMS, cioè nel sito pubblicato. Le
impostazioni da applicare alla PR 17 parlano invece dell'«account del
committente», e la PR 20 registra un'applicazione OAuth **su un'origine** e un
Worker su un account Cloudflare.

La domanda è una sola: a chi appartengono, alla fine, il repository e il progetto
Cloudflare. Se la risposta è «all'associazione», il trasferimento va fatto
**prima** della PR 20 e non dopo: dopo significa rifare l'applicazione OAuth, il
Worker, il collegamento del dominio e la riga del `config.yml`, che è l'unica
parte cara di tutto il giro. Se la risposta è «restano dove sono», va scritta
lo stesso, perché è la continuità del sito a dipenderne — un sito la cui
pubblicazione passa dall'account personale di chi l'ha costruito è un sito con
una persona sola nel percorso critico.

### L'immagine delle anteprime social

Il layout emette `og:image` solo se la pagina gliene passa una, e nessuna lo fa:
oggi un link condiviso su WhatsApp mostra titolo e descrizione, senza figura.
Le pagine serata della PR 9 avranno la foto tema, ma **il sito ha bisogno anche
di un'immagine predefinita** per la home e per le pagine istituzionali.

Va scelta, non generata a caso: il marchio su fondo blu è la strada ovvia, nel
formato 1200×630 che le anteprime si aspettano. È una decisione di contenuto e
di design, quindi non la prende una guardia — e per questo la suite **non**
pretende `og:image` quando arriva il dominio: pretenderlo avrebbe aperto la
PR 20 su un test rosso che si poteva chiudere solo inventando l'immagine.
Quello che la suite pretende è che, se una pagina ne pubblica una, sia assoluta.

## Minori

### Le due immagini segnaposto

`src/assets/photos/` contiene due immagini **generate**, non fotografie:
servono a far vedere funzionare la colonna dell'immagine e il caricamento
pigro, e lo dicono di sé stesse — c'è scritto «immagine segnaposto» sopra. Sono
assegnate alle serate 78 e 81, con un commento nel frontmatter.

Escono quando arrivano le foto vere dell'associazione, che è parte della
migrazione dell'archivio qui sopra.

> **Corretta alla PR 16.** Questa voce diceva «non c'è niente da decidere: c'è da
> ricordarsene», ed è la frase che questo repository esiste per non dover
> scrivere. `checkNoPlaceholders` legge `data-placeholder` nel markup, una foto
> non ha un blocco che la marca, e `dist/index.html` pubblica quelle due immagini
> con zero marcature: l'interruttore del dominio, che ferma la build sul lorem
> ipsum di `/chi-siamo`, le lascerebbe passare. Alla PR 17 entrano nell'elenco di
> `placeholder.ts` con la loro guardia, come la regola 20 prescrive — e allora
> non ci sarà più niente da ricordare.

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
il posto dove si tocca è la PR 20 insieme al resto dei meta.

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
rotta che la sitemap della PR 20 dovrebbe ricordarsi di escludere.

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
  lo usa una persona sola — che alla PR 14 è anche il motivo per cui l'accesso
  col token basta
- **Prestazioni dello scroller con tutte le serate**: si misura su un telefono
  vero, non in emulazione
