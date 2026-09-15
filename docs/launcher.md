# Managed mode: `claude-sdd launch`

`claude-sdd launch` is an optional, opt-in supervisor that enforces the
context boundary automatically instead of waiting for a human to start a
fresh Claude Code session. It is not required — plain plugin mode works with
zero setup — but it's the closest thing to "the user never has to think about
it" that is currently achievable without unsupported hacks. The full
investigation and rationale is in
[docs/context-boundaries.md](context-boundaries.md); this page is the
practical how-to.

## In one sentence

Instead of typing `claude` to start Claude Code, you type `claude-sdd
launch`. Everything looks and feels the same — except that when an SDD
specification finishes, instead of Claude asking *you* to type `/clear`,
this program does the equivalent for you automatically: it closes that
session and opens a brand-new one, right there in the same terminal window,
so you never have to remember to do it yourself.

## Usage

```bash
claude-sdd launch

# forward flags to every `claude --bg` call it makes (initial and every
# automatic restart) by putting them after a lone "--":
claude-sdd launch -- --dangerously-skip-permissions
claude-sdd launch -- --model opus --permission-mode acceptEdits
```

Run this from your own terminal, the same way you'd normally run `claude`.
Do **not** run it from inside an existing Claude Code session (via the Bash
tool, for example) — it refuses to start if it detects it's running inside
one already (see "Safety" below).

What happens:

1. It starts a fresh, backgrounded Claude Code session (`claude --bg`) and
   attaches to it in your terminal (`claude attach <id>`) — from this point
   on it behaves like a normal interactive `claude` session.
2. You work normally, including using SDD (creating specs, implementing
   tasks, checking off top-level tasks).
3. The moment a specification's last top-level task completes, the `Stop`
   hook requests a context boundary. The launcher notices (it watches
   `.claude/sdd-state.json`), stops the current session
   (`claude stop <id>`), and starts a brand-new one, attaching to it in the
   same terminal.
4. The new session's own startup reports the completed specification and its
   handoff automatically.
5. Repeat for as long as you keep working.

Ctrl+C, or simply ending the attached session yourself (however you'd
normally end a `claude` session), stops the launcher too — it only restarts
sessions it decided to stop itself, never a session that ended on its own.

## Plugin mode vs. managed mode

| | Plugin mode (default) | Managed mode (`claude-sdd launch`) |
| --- | --- | --- |
| Setup | None — just install the plugin | Run `claude-sdd launch` instead of `claude` |
| Detects completion | Yes | Yes (same engine) |
| Requests a context boundary | Yes (persisted, reported via `Stop`) | Yes (same mechanism) |
| Enforces the boundary | No — a human starts the fresh session | Yes — automatic |
| Restores the handoff | Yes, the moment *any* fresh session starts | Yes, automatically as part of the restart |
| Extra process | No | Yes — the launcher itself |
| Works from any shell/OS `claude` supports | Yes | Yes (Node.js supervisor, no OS-specific code) |

Both modes share the exact same lifecycle and state file — switching between
them (or dropping managed mode after trying it) changes nothing about
existing specifications or their status.

## Safety

- `claude-sdd launch` refuses to run when `CLAUDECODE` is set in its
  environment (Claude Code sets this in every process it spawns — confirmed
  by inspecting the actual environment, not assumed), specifically to avoid
  starting a nested Claude Code session from inside one. Pass `--force` only
  if you're certain that's a false positive for your setup.
- It restarts at most 5 times within any 60-second window
  (`src/launcher/launcher-state-machine.ts`); beyond that it stops
  restarting and exits, printing a warning, rather than spinning forever on
  a specification that keeps flapping between complete/incomplete.
- It only ever calls documented `claude` subcommands (`--bg`, `attach`,
  `stop`, `agents --json`) with fixed argv arrays — never a signal, never
  simulated input, never a raw process-tree kill.

## Limitations

- Not verified end-to-end through a full restart cycle. `claude --bg`,
  `agents --json`, `stop`, and `rm` were each confirmed against the real
  binary (one of those confirmations happened by accident during
  development — see
  [docs/context-boundaries.md](context-boundaries.md#what-was-and-wasnt-live-verified-and-how-one-confirmation-happened-by-accident)
  for the full, honest account), but a complete boundary → stop → restart →
  attach → restore cycle has not been. The restart *decision logic* is fully
  unit-tested against a fake session host
  (`tests/launcher/launcher-state-machine.test.ts`); the real process glue
  around it is not, on purpose, to avoid repeatedly starting real nested
  sessions while iterating.
- `claude --bg`'s stdout has since been observed in the wild:
  `backgrounded · <id>` plus a `claude attach <id>` hint line.
  `startBackground()` parses the id straight out of that text now, rather
  than requiring `claude agents --json` to also list it — the latter was
  observed to come back empty immediately after a session starts, which
  previously caused `LAUNCH_ID_UNRESOLVED` even though the id was right
  there in the `--bg` output. If `claude attach` behaves differently than
  documented on detach, or a future `--bg` output doesn't match this shape,
  please report it — `startBackground()` still fails loudly with the
  captured output attached rather than guessing.
- Requires the `claude` CLI to be on `PATH` under the exact name `claude`.
- Background sessions may have different permission-prompt handling before
  they're attached; this plugin attaches immediately after starting one, but
  hasn't independently verified that removes every edge case. If your
  workflow needs unattended permission handling, pass the relevant flags
  through, e.g. `claude-sdd launch -- --dangerously-skip-permissions` or
  `claude-sdd launch -- --permission-mode plan` — anything after a lone `--`
  is forwarded to every `claude --bg` call the launcher makes, including
  across automatic restarts.
