# Claude Code SDD

🇬🇧 [Read this README in English](README.md)

**Uno strato di SDD (Spec-Driven Development, "sviluppo guidato da specifiche") per [Claude Code](https://claude.com/claude-code): Claude tiene traccia delle specifiche, rileva quando sono complete e raggiunge un confine di contesto automatico — con supporto a più formati di specifica e [Kiro](https://kiro.dev) come primo formato supportato.**

Questo non è un clone di Kiro e non richiede Kiro. È un motore piccolo e
neutrale rispetto al formato, che insegna a Claude Code a riconoscere,
creare e tenere traccia di specifiche Spec-Driven Development in un
repository, e — questa è la parte nuova della versione 0.2 — a raggiungere
un vero confine di contesto quando una specifica finisce, in automatico se
attivi la modalità gestita.

```
Claude Code
   │
   ▼
Integrazione Claude Code SDD (hook + skill; launcher opzionale per la modalità gestita)
   │
   ▼
Motore SDD (core)   (neutrale: stato, completamento, confine di contesto, handoff)
   │
   ▼
Formato (provider)    ┌─ Kiro          (.kiro/specs/**)
                       └─ Generico     (.sdd/specs/**)
   │
   ▼
Filesystem (requirements.md / design.md / tasks.md)
```

## Come funziona in pratica

**Il problema che risolve:** stai lavorando con Claude Code su un task. Il
task finisce. Se continui a parlare nella stessa finestra, la conversazione
continua a crescere all'infinito, trascinandosi dietro tutto quello del
task finito anche se ormai non serve più. Quello che vuoi davvero è:
*quando un task è finito, fermati, dimmelo, e fammi ripartire pulito per il
prossimo.*

```text
Tu:       Implementa la funzionalità X.
Claude:   Crea una specifica SDD — requisiti, design, elenco di task.
          Li implementa, spuntando i task man mano.
...
Claude:   Ultimo task completato. La specifica X è finita.

          [viene richiesto un confine di contesto — vedi sotto]

Claude:   (sessione nuova) Contesto pulito avviato. La specifica X è
          completa. Handoff ripristinato. Cosa resta da fare: rivedere
          l'implementazione, e creare la prossima specifica se c'è altro.
```

**Cosa può e cosa non può fare un plugin dentro Claude Code:** un plugin
come questo può osservare cosa succede (l'ultimo task è stato spuntato? sì o
no) e può far dire a Claude delle cose. Quello che un plugin **non può
fare** è premere bottoni al posto tuo dentro il terminale: non può scrivere
`/clear` per te, non può chiudere la tua sessione, non può aprirne una
nuova. Non è una scelta di questo progetto — è che Claude Code stesso non dà
a un plugin un bottone per farlo. Questo è stato verificato controllando
direttamente il programma `claude` vero e la sua documentazione ufficiale,
non dato per scontato.

**Quindi, ecco cosa succede davvero, in ordine, con solo il plugin
installato (nessun programma extra):**

1. Chiedi a Claude di fare qualcosa. Claude crea una specifica (un piccolo
   piano: cosa costruire, come, e un elenco di passi da spuntare) e comincia
   a lavorarci.
2. Continui a parlare, Claude continua a spuntare i passi.
3. L'ultimo passo viene spuntato. Claude ora ti dice, chiaramente, qualcosa
   come: *"Questa specifica è completa. Puoi eseguire `/clear` ora — la
   prossima sessione ti dirà automaticamente cosa resta da fare, se resta
   qualcosa, prima di iniziare il prossimo task."*
4. Leggi questo messaggio e digiti tu `/clear` (oppure chiudi la finestra e
   ne apri una nuova — funziona uguale). Questo è l'unico passo manuale.
   Niente, in questo plugin, può saltarlo al posto tuo.
5. Nel momento in cui parte la tua nuova sessione vuota, il plugin si
   accorge che c'era una specifica finita in attesa, e Claude ti dice subito:
   *"Contesto pulito avviato. La specifica X è completa. Ecco cosa resta,
   se resta qualcosa."* Non devi chiederlo tu — succede appena parte una
   sessione pulita.

**Se non vuoi nemmeno scrivere tu `/clear`:** esiste una seconda modalità,
opzionale — `claude-sdd launch` — dove un piccolo programma separato esegue
Claude Code al posto tuo e fa da solo il passo 4 nel momento esatto in cui
succede il passo 3. Lanci un comando diverso invece di `claude`, e da quel
momento non tocchi più `/clear` di persona. È opzionale perché richiede un
programma extra in esecuzione, e perché cambia il modo in cui avvii Claude
Code — quindi viene offerta, mai imposta.

Nessuna delle due modalità è obbligatoria:

| | Modalità plugin (default, zero configurazione) | Modalità gestita: `claude-sdd launch` |
| --- | --- | --- |
| Rileva e traccia le specifiche | ✅ | ✅ |
| Richiede un confine di contesto al completamento | ✅ | ✅ |
| **Applica** il confine (ferma la vecchia sessione, ne apre una nuova) | Lo fai tu manualmente (`/clear`) | **Automatico** |
| Ripristina l'handoff nella sessione pulita | ✅, appena parte una sessione pulita | ✅, in automatico |

Leggi il meccanismo completo, cosa è davvero supportato ufficialmente e cosa
no, e il perché esatto, in
**[docs/context-boundaries.md](docs/context-boundaries.md)** (in inglese —
tutta la documentazione tecnica di questo progetto è in inglese, questo
README italiano è solo un'introduzione). Vale la pena leggerlo prima di
scegliere quale modalità usare, perché la risposta onesta ha diverse
sfumature (vedi [Limiti](#limiti)).

## Perché esiste

I cambiamenti non banali — nuove funzionalità, decisioni architetturali,
refactoring complessi — traggono beneficio dallo scrivere requisiti e design
prima di scrivere codice, e dal tracciare l'implementazione come un elenco
esplicito di task. Alcuni team lo fanno già con Kiro. Molti non lo fanno per
niente. `claude-code-sdd` rende Claude Code consapevole che questo flusso di
lavoro è disponibile, gli permette di creare una specifica quando non ne
esiste una, gli dà una regola deterministica e testata per capire quando una
specifica è davvero finita e — a differenza di una semplice checklist —
trasforma "finito" in un punto reale in cui la conversazione smette di
accumulare stato non pertinente.

## Cosa fa

- Dice a Claude Code, tramite una skill ufficiale del plugin, che questo
  repository supporta l'SDD e qual è la policy del flusso di lavoro (quando
  usarlo, quando no).
- Scopre le specifiche esistenti — `.kiro/specs/**/tasks.md` di Kiro, oppure
  il formato generico integrato `.sdd/specs/<nome>/` — e ne riporta stato e
  avanzamento tramite gli hook `SessionStart`/`Stop`, senza che tu debba
  chiedere nulla.
- Permette a Claude di creare una nuova specifica (`requirements.md`,
  `design.md`, `tasks.md`) quando non ne esiste una e il lavoro non è banale.
- Determina il completamento in modo **deterministico**: una specifica è
  finita solo quando ogni task di **primo livello** nel suo elenco è
  spuntato. I sotto-task annidati sono dettagli di avanzamento e non
  decidono mai da soli il completamento — vedi [Semantica di completamento
  dei task](#semantica-di-completamento-dei-task).
- Produce un **handoff** quando una specifica si completa e richiede un
  **confine di contesto** — salvato su disco, idempotente (non si ripete
  mai due volte), e ripristinato automaticamente la prossima volta che parte
  una sessione pulita, che tu l'abbia avviata tu stesso oppure che l'abbia
  avviata `claude-sdd launch`.

## Installazione

### Come plugin di Claude Code

```
/plugin marketplace add LuigiElleBalotta/claude-code-sdd
/plugin install claude-code-sdd
```

Oppure, per provarlo senza installarlo:

```
claude --plugin-dir /percorso/a/claude-code-sdd
```

Una volta installato, Claude Code ottiene:

- Una skill `sdd-workflow` che Claude usa automaticamente quando la
  richiesta sembra non banale, e hook `SessionStart`/`Stop` che lo tengono
  aggiornato sullo stato della specifica corrente e su qualsiasi confine di
  contesto in sospeso.
- Comandi espliciti: `/claude-code-sdd:sdd-status`,
  `/claude-code-sdd:sdd-init`, `/claude-code-sdd:sdd-validate`,
  `/claude-code-sdd:sdd-handoff`.

Questo da solo (modalità plugin) ti dà il tracciamento delle specifiche e
una richiesta di confine di contesto che si risolve nel momento in cui avvii
tu la prossima sessione pulita — nessun processo extra, nessun comando di
avvio diverso.

### Modalità gestita (opzionale): applica il confine in automatico

```
npm install -g claude-code-sdd
claude-sdd launch
```

Lancia questo comando al posto di `claude`, dal tuo terminale. Supervisiona
Claude Code usando i suoi stessi comandi ufficiali per le sessioni in
background (`--bg`, `attach`, `stop`) e lo riavvia automaticamente nel
momento in cui una specifica SDD richiede un confine di contesto — vedi
[docs/launcher.md](docs/launcher.md).

**Non lanciare mai `claude-sdd launch` da dentro una sessione Claude Code
già attiva** (avvieresti un processo Claude Code annidato dentro l'altro) —
per default si rifiuta di partire in quel caso, rilevandolo tramite la
variabile d'ambiente `CLAUDECODE` che Claude Code imposta in ogni processo
che avvia.

### Solo come CLI / libreria

```
npx claude-code-sdd status
```

`claude-code-sdd` esporta anche la sua API TypeScript (`createEngine`,
provider, modelli core, `SessionHost`/`LauncherStateMachine` del launcher)
per un uso programmatico — vedi [`src/index.ts`](src/index.ts).

## Comandi CLI

| Comando | A cosa serve |
| --- | --- |
| `claude-sdd detect` | Mostra quale formato SDD è attivo in questo repository |
| `claude-sdd status [--json]` | Mostra stato e avanzamento di ogni specifica |
| `claude-sdd validate [--json]` | Controlla la struttura delle specifiche; esce con codice 1 se trova problemi |
| `claude-sdd init <id> [--title <titolo>]` | Crea una nuova specifica |
| `claude-sdd handoff [--ack <id>] [--json]` | Mostra un handoff/confine di contesto in sospeso, o conferma quello di una modalità manuale legacy |
| `claude-sdd launch [--force]` | Modalità gestita: supervisiona Claude Code, si riavvia da solo a ogni confine di contesto |

Ogni comando accetta `--cwd <percorso>` per puntare a un progetto diverso da
quello corrente, e `--json` per un output leggibile da una macchina.

## Semantica di completamento dei task

Questa è la regola portante di tutto il progetto, quindi merita una sezione
tutta sua. Dato:

```markdown
## Tasks

- [x] 1. Implementa l'autenticazione
  - [x] 1.1 Crea il servizio di autenticazione
  - [ ] 1.2 Aggiungi la validazione del token
- [x] 2. Implementa l'autorizzazione
  - [x] 2.1 Aggiungi i ruoli
  - [x] 2.2 Aggiungi i permessi
- [ ] 3. Aggiungi i test
  - [ ] 3.1 Test unitari
  - [ ] 3.2 Test di integrazione
```

La specifica **non** è completa — il task `3`, di primo livello, non è
spuntato. Solo `1`, `2`, `3` (le voci di primo livello) decidono il
completamento; `1.1`, `1.2`, `2.1`, `2.2`, `3.1`, `3.2` sono sotto-task e
vengono ignorati a questo scopo, non importa quanti di loro siano spuntati.
Questo viene deciso guardando l'indentazione della lista, non i numeri dei
task — la numerazione può essere arbitraria, duplicata, o superare 9 senza
cambiare il risultato.

## Formati supportati (provider)

### Generico (ripiego di default)

```
.sdd/specs/<id-specifica>/
  requirements.md
  design.md
  tasks.md   (checklist sotto un'intestazione "## Tasks")
```

Leggibile da un umano, amico di Git, non richiede nient'altro oltre a questo
plugin. Usato ogni volta che la struttura di Kiro non è presente.

### Kiro

```
.kiro/specs/<id-specifica>/
  requirements.md
  design.md
  tasks.md
```

Scoperto tramite `.kiro/specs/**/tasks.md`, quindi le specifiche possono
essere annidate a qualsiasi profondità. Vedi
[docs/kiro-provider.md](docs/kiro-provider.md).

### Aggiungere un nuovo formato

Un provider implementa un'unica interfaccia (`SddProvider`: `isApplicable`,
`discover`, `read`, `create`) sopra modelli neutrali. Vedi
[docs/architecture.md](docs/architecture.md#adding-a-provider).

## Configurazione

File opzionale `.sdd/config.json` nella radice del progetto:

```json
{
  "provider": "auto",
  "handoffNotifications": true,
  "autoContextBoundary": true
}
```

`provider` è `"auto"` (default; Kiro se `.kiro/specs` esiste, altrimenti
generico), `"kiro"`, oppure `"generic"`. `handoffNotifications` (default
`true`) disattiva del tutto la reazione al completamento, se messo a
`false`. `autoContextBoundary` (default `true`) decide se il completamento
richiede subito un confine di contesto (`context_boundary`, ripristinato
automaticamente dalla prossima sessione pulita) oppure torna al flusso
manuale pre-0.2 con `handoff_pending` + `claude-sdd handoff --ack`. Vedi
[docs/configuration.md](docs/configuration.md).

## Stato locale

`.claude/sdd-state.json` tiene traccia, per ogni specifica, dell'ultimo
stato del ciclo di vita conosciuto e dell'intero handoff (non solo un id) —
così rilevamento del completamento, richieste di confine di contesto e
ripristino sono tutti idempotenti (rieseguire non ripete mai un avviso, non
richiede di nuovo un confine già gestito, non duplica un handoff). Le
scritture sono atomiche (file temporaneo poi rinominato), dato che un
launcher potrebbe osservare questo file in parallelo. È locale, usa e getta,
funziona su qualsiasi sistema operativo e non contiene segreti; puoi
metterlo nel repository se la tua squadra vuole condividere la cronologia
degli handoff, oppure ignorarlo con `.gitignore` — entrambe le scelte sono
sicure.

## Documentazione (in inglese)

- [Architettura](docs/architecture.md)
- [Ciclo di vita](docs/lifecycle.md)
- [Confini di contesto: l'indagine completa](docs/context-boundaries.md)
- [Modalità gestita / launcher](docs/launcher.md)
- [Provider Kiro](docs/kiro-provider.md)
- [Provider generico](docs/generic-provider.md)
- [Configurazione](docs/configuration.md)
- [Esempio di istruzioni di progetto](docs/example-project-instructions.md)
- [Come contribuire](CONTRIBUTING.md)

## Limiti

Leggi [docs/context-boundaries.md](docs/context-boundaries.md) per intero
prima di affidarti alla modalità gestita per qualcosa di importante. In
breve:

- Nessun meccanismo ufficialmente supportato di hook o plugin di Claude Code
  può terminare una sessione o avviarne una nuova dall'interno — questo
  progetto non afferma il contrario, e non lo finge (nessuna simulazione di
  tasti, nessun segnale inviato al processo `claude`, nessun trucco
  specifico per sistema operativo).
- La modalità gestita (`claude-sdd launch`) è costruita interamente sui
  comandi ufficiali documentati di `claude` per le sessioni in background
  (`--bg`, `attach`, `stop`, `agents --json`) — niente di non supportato —
  ma il ciclo reale di riavvio del launcher contro una sessione in
  background vera non è stato verificato dal vivo fino in fondo, solo la
  sua logica di decisione (testata con un finto host di sessione).
- La modalità plugin semplice (senza launcher) ripristina comunque
  l'handoff di una specifica completata in automatico non appena avvii tu
  la prossima sessione pulita — semplicemente non decide *quando* questo
  accade al posto tuo.

## Sicurezza

- Nessuna telemetria, nessuna chiamata di rete, nessun servizio esterno.
  Zero dipendenze a runtime.
- Non richiede mai una chiave API né memorizza credenziali.
- `.claude/sdd-state.json` non contiene segreti né percorsi assoluti
  specifici della macchina.
- `claude-sdd launch` invoca solo ed esclusivamente il binario `claude`
  stesso — nessun segnale inviato al processo di Claude Code.

## Licenza

MIT — vedi [LICENSE](LICENSE).
