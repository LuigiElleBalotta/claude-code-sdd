# Claude Code SDD

**An SDD (Spec-Driven Development) layer for [Claude Code](https://claude.com/claude-code), with provider-based specification support and [Kiro](https://kiro.dev) as the first provider.**

This is not a Kiro clone and does not require Kiro. It is a small, provider-neutral
engine that teaches Claude Code to recognize, create, and track Spec-Driven
Development specifications in a repository — using whichever specification
format that repository already has, or a simple built-in format if it has none.

```
Claude Code
   │
   ▼
Claude Code SDD integration (hooks + skills)
   │
   ▼
SDD core / engine   (provider-neutral: status, completion, handoff)
   │
   ▼
Provider              ┌─ Kiro          (.kiro/specs/**)
                       └─ Generic      (.sdd/specs/**)
   │
   ▼
Filesystem (requirements.md / design.md / tasks.md)
```

## Why

Non-trivial changes — new features, architectural decisions, complex refactors —
benefit from writing down requirements and a design before writing code, and
from tracking implementation as an explicit task list. Some teams already do
this with Kiro. Many don't do it at all. `claude-code-sdd` makes Claude Code
aware that this workflow is available, lets it create a specification when
none exists, and gives it a deterministic, tested rule for when a
specification is actually done.

## What it does

- Tells Claude Code, via an official plugin hook, that this repository
  supports SDD and what the workflow policy is (when to use it, when not to).
- Discovers existing specifications — Kiro's `.kiro/specs/**/tasks.md`, or the
  built-in generic `.sdd/specs/<name>/` layout — and reports their status and
  progress.
- Lets Claude create a new specification (`requirements.md`, `design.md`,
  `tasks.md`) when none exists and the work isn't trivial.
- Determines completion **deterministically**: a specification is done only
  when every **top-level** task in its task list is checked off. Nested
  subtasks are progress detail and never independently decide completion —
  see [Task completion semantics](#task-completion-semantics).
- Produces a **handoff** when a specification completes, and says so plainly —
  without ever pretending to reset Claude's context, which Claude Code does
  not currently support a plugin doing programmatically. See
  [Context boundaries](docs/context-boundaries.md).

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
  non-trivial, and a `SessionStart`/`Stop` hook that keeps it aware of the
  current specification status without you having to ask.
- Explicit commands: `/claude-code-sdd:sdd-status`, `/claude-code-sdd:sdd-init`,
  `/claude-code-sdd:sdd-validate`, `/claude-code-sdd:sdd-handoff`.

### As a CLI / library

```
npm install -g claude-code-sdd
claude-sdd status
```

or, without installing:

```
npx claude-code-sdd status
```

`claude-code-sdd` also exports its TypeScript API (`createEngine`, providers,
core models) for programmatic use — see [`src/index.ts`](src/index.ts).

## CLI reference

| Command | Purpose |
| --- | --- |
| `claude-sdd detect` | Show which SDD provider is active in this repository |
| `claude-sdd status [--json]` | Show every specification's status and task progress |
| `claude-sdd validate [--json]` | Check specification structure; exits 1 if issues are found |
| `claude-sdd init <id> [--title <title>]` | Create a new specification |
| `claude-sdd handoff [--ack <id>] [--json]` | Show, or acknowledge, a pending handoff |

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
  "handoffNotifications": true
}
```

`provider` is `"auto"` (default; Kiro if `.kiro/specs` exists, else generic),
`"kiro"`, or `"generic"`. `handoffNotifications` (default `true`) controls
whether a `Stop`-hook notice fires when a specification completes. See
[docs/configuration.md](docs/configuration.md).

## Local state

`.claude/sdd-state.json` tracks, per specification, the last known lifecycle
status and any handoff already produced — so completion detection and
handoffs are idempotent (re-running never repeats a notice or duplicates a
handoff). It is local, disposable, cross-platform, and contains no secrets;
commit it if your team wants shared handoff history, or gitignore it
otherwise — both are safe.

## Using SDD in your own project instructions

If you'd rather document the policy statically (in addition to, or instead
of, relying on the plugin's own hook/skill), see
[docs/example-project-instructions.md](docs/example-project-instructions.md)
for a copy-pasteable, English-only example.

## Documentation

- [Architecture](docs/architecture.md)
- [Lifecycle](docs/lifecycle.md)
- [Kiro provider](docs/kiro-provider.md)
- [Generic provider](docs/generic-provider.md)
- [Configuration](docs/configuration.md)
- [Context boundaries & limitations](docs/context-boundaries.md)
- [Example project instructions](docs/example-project-instructions.md)
- [Contributing](CONTRIBUTING.md)

## Limitations

Claude Code currently has no officially supported mechanism for a plugin to
programmatically clear or reset conversation context (there is no API
equivalent of `/clear`). This project never claims otherwise. See
[docs/context-boundaries.md](docs/context-boundaries.md) for exactly what it
does instead.

## License

MIT — see [LICENSE](LICENSE).
