---
description: Show or acknowledge a pending Spec-Driven Development handoff
argument-hint: [--ack <spec-id>]
disable-model-invocation: true
---

If "$ARGUMENTS" contains an `--ack <spec-id>`, run
`claude-sdd handoff --ack <spec-id> --json` with the Bash tool to acknowledge
that handoff. Otherwise run `claude-sdd handoff --json` to show any pending
handoffs. Present the result plainly. If a handoff is pending, remind the
user that Claude Code cannot reset context automatically — recommend they
start a fresh session (e.g. `/clear`) before continuing with unrelated work,
then acknowledge the handoff once they have done so.
