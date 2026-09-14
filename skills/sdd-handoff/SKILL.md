---
description: Show or acknowledge a pending Spec-Driven Development handoff
argument-hint: [--ack <spec-id>]
disable-model-invocation: true
---

If "$ARGUMENTS" contains an `--ack <spec-id>`, run
`claude-sdd handoff --ack <spec-id> --json` with the Bash tool. Note this only
applies to a specification in legacy manual mode (`autoContextBoundary: false`,
status `handoff_pending`) — a specification at `context_boundary` is restored
automatically by the next fresh session, not acknowledged here, and the CLI
will say so if asked to acknowledge one.

Otherwise, run `claude-sdd handoff --json` to show pending handoffs and
context-boundary requests, and present the result plainly. For anything at
`context_boundary`, remind the user it resolves automatically: on its own
under `claude-sdd launch` (managed mode), or the next time they start a fresh
Claude Code session otherwise — nothing needs to be run manually to "clear"
it.
