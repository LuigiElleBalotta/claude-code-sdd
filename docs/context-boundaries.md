# Context boundaries: what's automatic, what isn't, and why

This document is the record of a real investigation, not just a design
rationale. It exists because the honest answer to "can this be fully
automatic" is "it depends which half you mean" — and being precise about
which half matters more than sounding impressive.

## Plain-English version (read this first)

Skip this section if you already understand the rest of the document. It's
here so nobody has to guess.

**The problem this solves:** you're working with Claude Code on a task. The
task finishes. If you just keep talking in the same window, the conversation
keeps growing forever, dragging along everything from the finished task even
though it's irrelevant now. What you actually want is: *when a task is
done, stop, tell me it's done, and let me start clean for the next one.*

**What Claude Code will and won't let a plugin do:** a plugin like this one
can watch what's happening (did the last task get checked off? yes/no) and
it can make Claude say things to you. What a plugin **cannot** do is press
buttons for you inside your terminal — it cannot type `/clear`, it cannot
close your session, it cannot open a new one. That's not a choice this
project made; Claude Code itself simply doesn't give a plugin a button for
that. This was checked directly against the real `claude` program and its
real documentation, not assumed.

**So here's what actually happens, in order, with nothing installed beyond
the plugin itself:**

1. You ask Claude to do something. Claude creates a specification (a small
   plan: what to build, how, and a checklist of steps) and starts working
   through the checklist.
2. You keep talking, Claude keeps checking off steps.
3. The last step gets checked off. Claude now says, plainly, something like:
   *"This specification is complete. You can run `/clear` now — the next
   session will automatically tell you what's left, if anything, before you
   start the next task."*
4. You read that, and you type `/clear` yourself (or you close the window
   and open a new one — either works). This is the one manual step. Nothing
   the plugin does can skip it.
5. The moment your new, empty session starts, the plugin notices there was
   a finished specification waiting, and Claude immediately tells you:
   *"Fresh context started. Specification X is complete. Here's what's left
   to do, if anything."* You didn't have to ask for that — it just happens
   the instant a clean session begins.

**If you don't want to type `/clear` yourself at all:** there is a second,
optional mode — `claude-sdd launch` — where a small separate program runs
Claude Code *for* you and does step 4 on its own the moment step 3 happens.
You run one command instead of `claude`, and from then on you never touch
`/clear` yourself. It is optional because it needs its own extra program
running, and because it changes how you start Claude Code in the first
place — so it's offered, never forced. See [docs/launcher.md](launcher.md).

**Why can't the plugin also just do step 4 by itself, without that extra
program?** Because nothing running *inside* your Claude Code session — no
plugin, no hook, no skill — is allowed to reach outside itself and press
`/clear` or restart the window. Only something sitting *outside* the
session, watching it from the side (like `claude-sdd launch` does), is
allowed to do that, using the same official start/stop commands anyone can
type by hand. The rest of this document is the detailed, technical version
of exactly why, and exactly what was checked to be sure.

## The invariant

> Once an SDD specification reaches completion, the current session must not
> continue accumulating unrelated conversation state indefinitely. The
> workflow should reach a clean context boundary and restore the SDD state,
> as automatically as is technically legitimate.

## What was investigated

Current official Claude Code documentation and the actual installed CLI
(`claude --help`, and every relevant subcommand's own `--help`, checked
directly rather than assumed) were both used — a documentation summary
mentioned commands (`claude --bg`, `attach`, `stop`, `agents --json`,
`respawn`) that seemed almost too convenient to be real, so each one was
verified against the real binary before anything was built on it.

Confirmed, from the hooks reference:

- No hook event's exit code or JSON output terminates the `claude` process.
  `Stop` exit code 2 only *prevents* stopping (keeps the conversation going —
  the opposite of what's needed).
- No hook can start a new session. `SessionEnd` fires when a session already
  ended; nothing hands control to a successor.
- Hook self-termination (a hook process killing its own parent, or calling
  something equivalent) is undefined behavior — not documented as supported,
  not documented as safe. Not used, anywhere in this codebase.

Confirmed, from the CLI itself:

- `claude --bg` starts a session in the background and returns immediately.
- `claude attach <id>` opens a background session in the current terminal.
- `claude stop <id>` stops a background session; its conversation is kept.
- `claude agents --json` lists active sessions as JSON, "for scripting;
  does not require a TTY".
- `claude respawn <id>` restarts a background session "so it runs the
  current Claude binary" — this is a version-upgrade mechanism, **not** a
  fresh-context mechanism, and was deliberately not used for that reason: it
  exists specifically to *preserve* the conversation across a binary update.
- A genuinely fresh context needs no special flag at all: a plain `claude`
  invocation (backgrounded or not) with no `--resume`/`--continue`/
  `--fork-session` is already a brand-new session. The hard problem was
  never "how do we get a clean context" — it's "how do we cause that
  transition to happen without a human doing it".

## Approaches evaluated

| Approach | Officially supported | Win/mac/Linux | Needs a wrapper | Needs another process | Deterministic | Recursive-process risk | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **A. Pure plugin/hook** | Yes | Yes | No | No | Yes (detection), No (reset) | None | Can *detect and request* a boundary; **cannot enforce one**. Used for exactly what it can do — see below. |
| **B. Hook self-terminates its own process** | No (undefined) | Unverified | No | No | No | Could kill the host CLI mid-turn | Rejected. Explicitly what §6 of the brief forbids the spirit of, even though it isn't a keystroke hack. |
| **C. Bespoke launcher: raw `spawn`/`kill` of the `claude` process tree** | No | Yes, but fragile (shell-wrapped children, Windows process trees) | Yes | Yes | Mostly | Only if misused | Works, but reinvents process-tree management Anthropic already solved. Not used once D was confirmed available. |
| **D. Launcher over `claude`'s own background-session commands** | Yes — every operation is a documented subcommand | Yes (same CLI everywhere) | Yes (opt-in) | Yes (the launcher itself) | Yes | Guarded explicitly (see below) | **Implemented.** The strongest legitimate automation available today. |

Approach D is `claude-sdd launch` (`src/launcher/`). It never sends a signal
to the `claude` process and never simulates input — it only calls `--bg`,
`attach`, `stop`, and `agents --json`, exactly as a human would type them.

## How `claude-sdd launch` works

```text
claude-sdd launch
        │
        ▼
claude --bg                    (a fresh, backgrounded session; no prompt)
        │
        ▼
claude attach <id>             (foreground — behaves like plain `claude` to the user)
        │
   [user works; an SDD spec's last top-level task completes]
        │
   Stop hook: sync() → status = context_boundary, persisted to .claude/sdd-state.json
        │
   launcher's filesystem watcher notices → claude stop <id>
        │
   claude --bg                 (a NEW session — no synthetic prompt, see below)
        │
   claude attach <new-id>
        │
   that session's own SessionStart hook: restoreContextBoundaries()
        │
   additionalContext: "Fresh context started. SDD handoff restored: ..."
```

Two design choices worth calling out because they weren't the first idea:

- **The fresh session is started with no prompt.** The natural instinct
  is to hand the new session a prompt built from the handoff summary — don't.
  That would make the new session start acting completely unprompted, which
  is the aggressive kind of automation this plugin is supposed to avoid. The
  existing `SessionStart` hook already reports the restored handoff via
  `additionalContext`; that channel is sufficient, and it comes from a hook
  that only ever fires because a session actually, verifiably started.
- **The session id used for `attach`/`stop` always comes from that specific
  `claude --bg` call's own captured output**, cross-checked against
  `claude agents --json`, never from "whichever session looks newest" — the
  latter is a race with any other session running on the machine, and
  attaching a user's terminal to someone else's session is a real, visible
  failure, not a theoretical one.

The launcher never touches the SDD lifecycle itself (no handoff logic, no
knowledge of Kiro vs. generic) — it only watches `.claude/sdd-state.json` for
any specification reaching `context_boundary` and reacts to process
lifecycle events. The engine and hooks own everything about *what* completed
and *what to say*; the launcher only owns *when a new process should exist*.

## What was deliberately NOT done

- No keyboard input simulation, no `Ctrl+L`/`Ctrl+C` injection, no terminal
  scraping.
- No OS-specific process-tree hacks (see approach C above) — every restart
  goes through `claude`'s own subcommands.
- No hook or skill in this plugin ever shells out to `claude` itself. Only
  `claude-sdd launch`, run directly by a human from their own shell, does
  that. This is enforced, not just documented: `claude-sdd launch` refuses to
  run when `CLAUDECODE` is set in its environment (confirmed empirically to
  be set in every process Claude Code spawns), specifically to avoid
  spawning a nested Claude Code session from inside one. Use `--force` only
  if you are certain that guard is a false positive.
- No claim, anywhere in this plugin's hook output, that context was reset
  unless the hook making the claim is `SessionStart` on a run that is itself
  the fresh session (see `describeForRestoration` in
  `src/claude-code/describe-sync.ts`).

## What was (and wasn't) live-verified, and how one confirmation happened by accident

The intent throughout development was to avoid spawning `claude --bg` for
real from inside this environment, since that starts a genuine nested Claude
Code session — exactly the risk the `CLAUDECODE` guard above exists to
prevent. That held for most of the work: every `claude` subcommand and flag
relied on here was checked against `claude --help` and each subcommand's own
`--help` on the real installed binary first, without executing anything.

It did not hold perfectly. While testing the CLI's argument parsing for
`claude-sdd launch`'s `--force` and `--` passthrough (added so flags like
`--dangerously-skip-permissions` reach the spawned session), a test command
included `--force` together with real passthrough args — which is precisely
what `--force` is for, so the guard stepped aside and `claude --bg` actually
ran. This **did** start a real background session. It was caught immediately
(`claude agents --json` showed it), stopped (`claude stop <id>`), and removed
(`claude rm <id>`), with no lasting effect. Reported here rather than quietly
fixed and left out, because the alternative — claiming this was never tested
when it briefly, accidentally, was — would be exactly the kind of dishonest
claim this whole document argues against making.

What that accident actually confirmed, incidentally:

- `claude --bg` genuinely backgrounds a session and returns control.
- `claude agents --json` returns a flat JSON array of objects, each carrying
  an `id` field — matching `extractIdsFromAgentsJson`'s primary parse case in
  `src/launcher/parse-agents-output.ts` exactly.
- `claude stop <id>` and `claude rm <id>` both work as documented.

What it did **not** confirm, because the terminal output was truncated
(piped through `head`) before it could be observed: whether
`extractSessionId` correctly parsed the id out of that specific `--bg`
call's own stdout text. That remains the one genuinely unverified piece —
if it fails in practice, `startBackground()` throws `LAUNCH_ID_UNRESOLVED`
with the captured output attached, rather than guessing or attaching to the
wrong session (see "Never attach to an id you inferred" above).

Also still unverified: whether `claude attach <id>` returns control to the
launcher's terminal when the underlying session is stopped, or drops into
some other interactive picker first (its own `--help` text says it "returns
to agent view" on detach, which is ambiguous on this point). If it doesn't
behave as expected, the failure mode is narrow and visible — the launcher
emits a warning and exits rather than restarting silently into the wrong
state — but this is worth watching for when actually running
`claude-sdd launch`.

The launcher's restart *decision logic*
(`src/launcher/launcher-state-machine.ts`) is a pure state machine with zero
process/filesystem code, and is fully unit-tested
(`tests/launcher/launcher-state-machine.test.ts`) against a fake host — every
scenario in this document's flow diagram, plus the restart-loop breaker, is
exercised there without touching a real process. That test suite is what
this project actually relies on for correctness; the accidental live run
above is corroborating evidence, not a substitute for it.

## Graceful degradation without a launcher

Because `restoreContextBoundaries()` runs from `SessionStart` regardless of
*why* a new session started, plain plugin mode (no launcher) still gets the
restoration half of this automatically: the human has to remember to start a
fresh session, but the moment they do, it reports the completed
specification and its handoff without anything further to run. Nothing about
running `claude-sdd launch` changes what a fresh session reports — it only
changes who/what causes that fresh session to start.

## The architectural conclusion

1. **Can the plugin itself (hooks/skills only) enforce an automatic context
   boundary?** No. It can detect completion, persist a handoff, and request
   a boundary — deterministically and idempotently — but nothing in the
   officially documented hook/skill surface can end the current session or
   start a new one.
2. **What's the closest officially supported mechanism?** `claude`'s own
   background-session subcommands (`--bg`, `attach`, `stop`,
   `agents --json`). They were not designed for this specific purpose, but
   they compose into it without any unsupported behavior.
3. **Is a launcher/wrapper required for true automation?** Yes. Something
   has to own the decision to stop one process and start the next; nothing
   inside the process being stopped can safely make that call.
4. **What should `claude-code-sdd` recommend as the default experience?**
   Plain plugin mode by default (zero setup, works everywhere Claude Code
   plugins do) with `claude-sdd launch` offered as the recommended *upgrade*
   for anyone who wants the boundary enforced without remembering to start a
   new session themselves. Neither is forced on the other.
