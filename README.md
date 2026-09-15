# Claude Code SDD

🇮🇹 [Leggi questo README in italiano](README.it.md)

**An SDD (Spec-Driven Development) layer for [Claude Code](https://claude.com/claude-code): Claude tracks specs, detects completion, and reaches an automatic context boundary — with provider-based specification support and [Kiro](https://kiro.dev) as the first provider.**

This is not a Kiro clone and does not require Kiro. It is a small,
provider-neutral engine that teaches Claude Code to recognize, create, and
track Spec-Driven Development specifications in a repository, and — this is
the part that changed in 0.2 — to reach a genuine context boundary when one
completes, automatically if you opt into managed mode.

```
Claude Code
   │
   ▼
Claude Code SDD integration (hooks + skills; optional launcher for managed mode)
   │
   ▼
SDD core / engine   (provider-neutral: status, completion, context boundary, handoff)
   │
   ▼
Provider              ┌─ Kiro          (.kiro/specs/**)
                       └─ Generic      (.sdd/specs/**)
   │
   ▼
Filesystem (requirements.md / design.md / tasks.md)
```

## The experience

```text
You:      Implement feature X.
Claude:   Creates an SDD spec — requirements, design, tasks. Implements them,
          checking off tasks as it goes.
...
Claude:   Final top-level task complete. Specification X is done.

          [a context boundary is requested — see below]

Claude:   (fresh session) Fresh context started. Specification X is complete.
          Handoff restored. What remains: review the implementation, and
          create the next specification if there's more to do.
```

Whether the part in brackets happens **automatically** — you never have to
type `/clear` or remember to start a new session — depends on which of two
modes you run:

| | Plugin mode (default, zero setup) | Managed mode: `claude-sdd launch` |
| --- | --- | --- |
| Detects & tracks specs | ✅ | ✅ |
| Requests a context boundary on completion | ✅ | ✅ |
| **Enforces** the boundary (stops the old session, starts a new one) | You do it manually | **Automatic** |
| Restores the handoff into the fresh session | ✅, the moment any fresh session starts | ✅, automatically |

Neither is forced on you. Read the full mechanism, what's officially
supported vs. what isn't, and exactly why in
**[docs/context-boundaries.md](docs/context-boundaries.md)** — it's worth
reading before you decide which mode fits, because the honest answer has
real nuance (see [Limitations](#limitations)).

## Why

Non-trivial changes — new features, architectural decisions, complex refactors —
benefit from writing down requirements and a design before writing code, and
from tracking implementation as an explicit task list. Some teams already do
this with Kiro. Many don't do it at all. `claude-code-sdd` makes Claude Code
aware that this workflow is available, lets it create a specification when
none exists, gives it a deterministic, tested rule for when a specification
is actually done, and — unlike a plain checklist — turns "done" into an
actual point where the conversation stops accumulating unrelated state.

## What it does

- Tells Claude Code, via an official plugin skill, that this repository
  supports SDD and what the workflow policy is (when to use it, when not to).
- Discovers existing specifications — Kiro's `.kiro/specs/**/tasks.md`, or the
  built-in generic `.sdd/specs/<name>/` layout — and reports their status and
  progress via `SessionStart`/`Stop` hooks, without you having to ask.
- Lets Claude create a new specification (`requirements.md`, `design.md`,
  `tasks.md`) when none exists and the work isn't trivial.
- Determines completion **deterministically**: a specification is done only
  when every **top-level** task in its task list is checked off. Nested
  subtasks are progress detail and never independently decide completion —
  see [Task completion semantics](#task-completion-semantics).
- Produces a **handoff** when a specification completes and requests a
  **context boundary** — persisted, idempotent, and restored automatically
  the next time a fresh session starts, whether that fresh session was
  started by you or by `claude-sdd launch`. See
  [docs/context-boundaries.md](docs/context-boundaries.md) for exactly what
  is and isn't automatic, and why.

## Install

### As a Claude Code plugin

```
/plugin marketplace add LuigiElleBalotta/claude-code-sdd
/plugin install claude-code-sdd
```

Or, to try it without installing:

```
claude --plugin-dir /path/to/claude-code-sdd
```

Once installed, Claude Code gains:

- A `sdd-workflow` skill that Claude uses automatically when the request looks
  non-trivial, and `SessionStart`/`Stop` hooks that keep it aware of the
  current specification status and any pending context boundary.
- Explicit commands: `/claude-code-sdd:sdd-status`, `/claude-code-sdd:sdd-init`,
  `/claude-code-sdd:sdd-validate`, `/claude-code-sdd:sdd-handoff`.

This alone (plugin mode) gives you spec tracking and a requested context
boundary that resolves the moment you next start a fresh session — no
extra process, no changed launch command.

### Managed mode (optional): enforce the boundary automatically

> **Not yet published to the npm registry.** Install straight from GitHub
> until it is — this works today, no publishing step required, because
> the compiled `dist/` is committed to the repo (see
> [CONTRIBUTING.md](CONTRIBUTING.md)). `npm install -g github:owner/repo`
> is broken on some npm versions for **global** installs specifically (it
> links to a temp cache folder that doesn't persist) — clone and install
> from the local clone instead, which is the reliable path:
>
> ```
> git clone https://github.com/LuigiElleBalotta/claude-code-sdd.git
> cd claude-code-sdd
> npm install -g .
> ```
>
> (already have the repo cloned locally, e.g. this one? just `cd` into it
> and run `npm install -g .` — no need to clone it again.)
>
> Once it's published, the command will simply be
> `npm install -g claude-code-sdd`.

```
claude-sdd launch
```

Run this instead of plain `claude`, from your own shell. It supervises
Claude Code using its own official background-session commands (`--bg`,
`attach`, `stop`) and restarts it automatically the moment an SDD
specification requests a context boundary — see
[docs/launcher.md](docs/launcher.md).

**Never run `claude-sdd launch` from inside an active Claude Code session**
(it would start a nested Claude process) — it refuses to do so by default,
detected via the `CLAUDECODE` environment variable Claude Code sets in every
process it spawns.

#### Important: managed mode can block edits until you set one thing

This part is easy to miss, so read it before you rely on managed mode.

`claude-sdd launch` starts every session as a **background** session (via
`claude --bg`) and then attaches your terminal to it (`claude attach`). This
is a safety feature *of Claude Code itself* (not this project): to stop a
background session from editing a shared checkout you might also be editing
by hand at the same time, Claude Code blocks that session's Edit/Write calls
until it moves into an isolated copy of the repo (a git worktree under
`.claude/worktrees/`). **Attaching your terminal to the session does not turn
this protection off** — Claude Code still treats it as a background session
even while you're driving it interactively.

So: if you use managed mode and Claude suddenly gets blocked mid-edit,
asking to move into a worktree, that's this feature — it isn't a bug in your
project. (There is a separate, real bug in the worktree it creates —
covered in [docs/launcher.md#limitations](docs/launcher.md#limitations) —
so this is also a reason to avoid triggering it if you can.) `claude-sdd
launch` prints a warning about this every time it starts, unless you've
turned the protection off yourself.

**To turn it off**, so managed-mode sessions can edit this checkout directly
(the way plugin mode always could), add this JSON to **one** of these files
— checked in this order, first one that exists and sets it wins:

1. `.claude/settings.local.json` — this project, this machine only, never
   committed to git. The safest place if you're the only one using managed
   mode here.
2. `.claude/settings.json` — this project, shared with your team via git.
3. Your **user-level** settings file, which applies to every project.
   Normally that's `~/.claude/settings.json` — but if you set the
   `CLAUDE_CONFIG_DIR` environment variable (for example inside a launch
   script, e.g. `set "CLAUDE_CONFIG_DIR=%USERPROFILE%\.claude-work"` on
   Windows), it's `%CLAUDE_CONFIG_DIR%\settings.json` instead, with **no**
   extra `.claude` subfolder — `CLAUDE_CONFIG_DIR` replaces `~/.claude`
   entirely, it doesn't sit inside it.

```json
{
  "worktree": {
    "bgIsolation": "none"
  }
}
```

**Read this before you flip it:** this setting exists specifically to
protect you from a background session and a human editing the same files at
the same time. Turning it off is fine if you never hand-edit this checkout
while a `claude-sdd launch` session is running against it — which is the
normal way to use managed mode (you're driving that one attached session,
not also opening the files yourself elsewhere). If you *do* sometimes edit
this checkout by hand in parallel, leave the protection on and expect the
occasional worktree prompt instead.

This guard, and exactly how `claude attach` does or doesn't affect it, is
Claude Code's own behavior — this project can warn you about it but cannot
change it. Full technical account, including what's officially documented
versus what's only been observed:
[docs/launcher.md#limitations](docs/launcher.md#limitations).

### As a CLI / library only

```
npx github:LuigiElleBalotta/claude-code-sdd status
```

(`npx claude-code-sdd status` once the package is published to npm.)

`claude-code-sdd` also exports its TypeScript API (`createEngine`, providers,
core models, the launcher's `SessionHost`/`LauncherStateMachine`) for
programmatic use — see [`src/index.ts`](src/index.ts).

## CLI reference

| Command | Purpose |
| --- | --- |
| `claude-sdd detect` | Show which SDD provider is active in this repository |
| `claude-sdd status [--json]` | Show every specification's status and task progress |
| `claude-sdd validate [--json]` | Check specification structure; exits 1 if issues are found |
| `claude-sdd init <id> [--title <title>]` | Create a new specification |
| `claude-sdd handoff [--ack <id>] [--json]` | Show a pending handoff/context-boundary request, or acknowledge a legacy manual-mode one |
| `claude-sdd launch [--force]` | Managed mode: supervise Claude Code, auto-restart on a context boundary |

Every command accepts `--cwd <path>` to target a project other than the
current directory, and `--json` for machine-readable output.

## Task completion semantics

This is the load-bearing rule of the whole project, so it gets its own
section. Given:

```markdown
## Tasks

- [x] 1. Implement authentication
  - [x] 1.1 Create authentication service
  - [ ] 1.2 Add token validation
- [x] 2. Implement authorization
  - [x] 2.1 Add roles
  - [x] 2.2 Add permissions
- [ ] 3. Add tests
  - [ ] 3.1 Unit tests
  - [ ] 3.2 Integration tests
```

The specification is **not** complete — task `3` is an unchecked top-level
task. Only `1`, `2`, `3` (the top-level entries) decide completion; `1.1`,
`1.2`, `2.1`, `2.2`, `3.1`, `3.2` are subtasks and are ignored for this
purpose, no matter how many of them are checked. This is enforced by list
indentation, not by the task numbers — numbering can be arbitrary, duplicated,
or exceed 9 without affecting the result. See
[`tests/core/tasks/parse-task-list.test.ts`](tests/core/tasks/parse-task-list.test.ts)
and [`tests/providers/kiro/kiro-provider.test.ts`](tests/providers/kiro/kiro-provider.test.ts)
for the full test matrix (CRLF/LF, malformed lines, missing sections, etc).

## Providers

### Generic (default fallback)

```
.sdd/specs/<spec-id>/
  requirements.md
  design.md
  tasks.md   (checklist under a "## Tasks" heading)
```

Human-readable, Git-friendly, requires nothing but this plugin. Used whenever
Kiro's structure isn't present.

### Kiro

```
.kiro/specs/<spec-id>/
  requirements.md
  design.md
  tasks.md
```

Discovered via `.kiro/specs/**/tasks.md`, so specs can be nested arbitrarily
deep. See [docs/kiro-provider.md](docs/kiro-provider.md).

### Adding a provider

A provider implements one interface (`SddProvider`: `isApplicable`,
`discover`, `read`, `create`) over provider-neutral models. See
[docs/architecture.md](docs/architecture.md#adding-a-provider).

## Configuration

Optional `.sdd/config.json` at the project root:

```json
{
  "provider": "auto",
  "handoffNotifications": true,
  "autoContextBoundary": true
}
```

`provider` is `"auto"` (default; Kiro if `.kiro/specs` exists, else generic),
`"kiro"`, or `"generic"`. `handoffNotifications` (default `true`) is a pure
opt-out of reacting to completion at all. `autoContextBoundary` (default
`true`) controls whether completion requests a context boundary
(`context_boundary`, restored automatically by the next fresh session) or
falls back to the pre-0.2 manual `handoff_pending` + `claude-sdd handoff --ack`
flow. See [docs/configuration.md](docs/configuration.md).

## Local state

`.claude/sdd-state.json` tracks, per specification, the last known lifecycle
status and the full handoff record (not just an id) — so completion
detection, context-boundary requests, and restoration are all idempotent
(re-running never repeats a notice, re-requests a boundary already handled,
or duplicates a handoff). Writes are atomic (temp-file-then-rename), since a
launcher process may be watching this file concurrently. It is local,
disposable, cross-platform, and contains no secrets; commit it if your team
wants shared handoff history, or gitignore it otherwise — both are safe.

## Using SDD in your own project instructions

If you'd rather document the policy statically (in addition to, or instead
of, relying on the plugin's own hook/skill), see
[docs/example-project-instructions.md](docs/example-project-instructions.md)
for a copy-pasteable, English-only example.

## Documentation

- [Architecture](docs/architecture.md)
- [Lifecycle](docs/lifecycle.md)
- [Context boundaries: the full investigation](docs/context-boundaries.md)
- [Managed mode / launcher](docs/launcher.md)
- [Kiro provider](docs/kiro-provider.md)
- [Generic provider](docs/generic-provider.md)
- [Configuration](docs/configuration.md)
- [Example project instructions](docs/example-project-instructions.md)
- [Contributing](CONTRIBUTING.md)

## Limitations

Read [docs/context-boundaries.md](docs/context-boundaries.md) in full before
relying on managed mode for anything important. In short:

- No officially supported Claude Code hook or plugin mechanism can end a
  session or start a new one from the inside — this project doesn't claim
  otherwise, and doesn't fake it (no keystroke simulation, no signals to the
  `claude` process, no OS-specific hacks).
- Managed mode (`claude-sdd launch`) is built entirely on `claude`'s own
  documented background-session commands (`--bg`, `attach`, `stop`,
  `agents --json`) — nothing unsupported — but the launcher's actual
  restart cycle against a real background session has not been
  live-verified end-to-end, only its decision logic (unit-tested against a
  fake session host). See
  [docs/launcher.md#limitations](docs/launcher.md#limitations).
- Plain plugin mode (no launcher) still restores a completed specification's
  handoff automatically the moment you next start a fresh session — it just
  doesn't decide *when* that happens for you.
- Managed mode can trigger Claude Code's own background-session Edit guard
  (it blocks direct edits until the session moves into a git worktree, even
  while attached) — see
  [Important: managed mode can block edits](#important-managed-mode-can-block-edits-until-you-set-one-thing)
  above for the one setting that avoids it and the tradeoff it involves.

## Security

- No telemetry, no network calls, no external services. Zero runtime
  dependencies.
- Never requires an API key or stores credentials.
- `.claude/sdd-state.json` contains no secrets and no machine-specific
  absolute paths.
- `claude-sdd launch` only ever invokes the `claude` binary itself, with
  fixed argv arrays — no shell string interpolation of untrusted input, no
  signals sent to the Claude Code process.

## License

MIT — see [LICENSE](LICENSE).
