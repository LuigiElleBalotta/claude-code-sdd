# Lifecycle

**In plain terms:** a specification starts as an empty plan (`draft`), gets
a checklist (`approved`), gets worked on (`in_progress`), and finishes
(`completed`) once every item on the checklist is checked. Everything after
`completed` in the diagram below is just bookkeeping this plugin does so it
never nags you twice about the same finished specification, and so it knows
exactly what to tell you the moment you start a clean session. You don't
need to manage any of these states by hand — they're shown here so it's
clear the system always knows exactly where things stand, not left to guess.

```text
draft → approved → in_progress → completed
                                     │
                    handoffNotifications: false → (stays "completed", nothing further)
                                     │
                    handoffNotifications: true
                                     │
                ┌────────────────────┴────────────────────┐
   autoContextBoundary: false                 autoContextBoundary: true (default)
                │                                          │
         handoff_pending                            context_boundary
                │                                          │
   claude-sdd handoff --ack                    a NEW session starts
                │                                          │
        handoff_completed                          handoff_restored
            (terminal)                                (terminal)
```

| Status | Meaning | Determined by |
| --- | --- | --- |
| `draft` | No tasks defined yet (or no tasks section at all) | File-observed |
| `approved` | Tasks defined, none started | File-observed |
| `in_progress` | Some but not all top-level tasks done | File-observed |
| `completed` | Every top-level task done | File-observed |
| `handoff_pending` | A handoff was produced; automatic boundary requesting is off; waiting for manual `--ack` | Persisted overlay |
| `context_boundary` | A handoff was produced and a context boundary has been **requested** — waiting for a new session to start | Persisted overlay |
| `handoff_completed` | The manual-mode handoff was acknowledged | Persisted overlay (terminal) |
| `handoff_restored` | A fresh session consumed the pending boundary | Persisted overlay (terminal) |

The first four are recomputed from the specification's files every time
(`core/lifecycle/derive-status.ts`). The rest live only in
`.claude/sdd-state.json` — they record "have we already reacted to this
completion", which is not something the specification's own files can say.

Note there is no separate `fresh_session` status: that's not a property of a
*specification*, it's a property of a *session*. What actually happens is a
`SessionStart` hook call with a start reason (`startup`/`clear`/etc.), and
that call is what drives `context_boundary → handoff_restored` — see
"Restoration" below.

## Why `context_boundary` is the default, not `handoff_pending`

Earlier versions of this plugin stopped at `handoff_pending` and asked a
human to run `claude-sdd handoff --ack` after starting a fresh session
themselves. `autoContextBoundary: true` (the default since 0.2) instead
requests a **context boundary** immediately: the specification is marked
`context_boundary`, and whichever mechanism is available — a human manually
starting a new Claude Code session, or `claude-sdd launch` (managed mode)
doing it automatically — consumes it the moment a fresh session actually
starts. See [docs/context-boundaries.md](context-boundaries.md) for the full
mechanism and why plain plugin mode still degrades gracefully with no
launcher running at all.

Set `"autoContextBoundary": false` in `.sdd/config.json` to keep the old,
purely manual `handoff_pending` / `--ack` behavior instead.

## Idempotency

`SddEngine.sync()` (called by the `Stop` hook, and by `claude-sdd status` /
`detect` / `validate` / `handoff`) is the only place a specification is ever
moved into `handoff_pending` or `context_boundary`, and it only does so the
first time it observes `completed` for that specification. It **never**
advances a specification past `context_boundary` on its own — see why in the
docstring on `sync()` in
[`src/core/engine/sdd-engine.ts`](../src/core/engine/sdd-engine.ts): `sync()`
runs on every `Stop`, so if it self-promoted boundaries it would falsely mark
a still-running session's own pending boundary as "restored" the instant the
user sent another message.

`SddEngine.restoreContextBoundaries()` is the only place `context_boundary`
becomes `handoff_restored`, and it is only ever called from the
`SessionStart` hook — and only for a start reason that plausibly represents a
clean context (`startup` / `clear`, not `resume` / `compact` / `fork`). It is
idempotent: calling it with nothing pending, or calling it twice in a row,
restores nothing the second time. This is covered explicitly by
[`tests/core/engine/sdd-engine.test.ts`](../tests/core/engine/sdd-engine.test.ts)
— in particular the test named for exactly this property, since it's the one
that would otherwise turn into a restart loop.

If a top-level task is unchecked again after completion (someone reopens
work), the next `sync()` drops the persisted handoff from **any** of the four
overlay statuses and resumes normal tracking from whatever the files now say
— including from `handoff_restored`, which is otherwise terminal.

`acknowledgeHandoff` only accepts a specification at `handoff_pending` (or
already `handoff_completed`, idempotently) — calling it on a
`context_boundary` specification is rejected with an actionable error
pointing at the real path (start a fresh session, or run under
`claude-sdd launch`), since acknowledging isn't how that path resolves.
