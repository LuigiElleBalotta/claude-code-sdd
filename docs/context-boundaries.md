# Context boundaries & limitations

## What Claude Code currently supports

As of the plugin architecture this project targets, Claude Code hooks
(`SessionStart`, `Stop`, `PreCompact`, etc.) can return `additionalContext`
and `systemMessage` to inform Claude, and can block certain actions, but
**there is no officially supported mechanism for a hook or plugin to
programmatically clear or reset the conversation — no API equivalent of the
interactive `/clear` command.** `/clear` is a user/UI-level action.

This project treats that as a hard constraint, not an implementation detail
to work around. It does **not**:

- simulate keyboard input or otherwise try to trigger `/clear` from a hook or
  script,
- claim in any user-facing text that it "cleared", "reset", or "started a new
  session" automatically,
- silently drop state to fake a clean context.

## What it does instead

When `SddEngine.sync()` observes that a specification has newly completed
(every top-level task done), it:

1. Produces a `Handoff` record — a summary of what completed and what to do
   next — and persists it in `.claude/sdd-state.json` so it survives a
   restart, a compaction, or a fresh session.
2. Surfaces this through the `Stop` hook's `additionalContext`, telling
   Claude (not the user directly) that this unit of SDD work is complete and
   that it should tell the user a fresh session is recommended before moving
   to unrelated work — see `describeForStop` in
   [`src/claude-code/describe-sync.ts`](../src/claude-code/describe-sync.ts).
3. Leaves the actual context reset to the user (`/clear`, or simply starting
   a new `claude` session) or to whatever the Claude Code platform later
   supports natively for this. Nothing is lost in the meantime: the
   specification's own files and `.claude/sdd-state.json` are the durable
   record, so a fresh session picks up exactly where the old one left off by
   running `claude-sdd status`, which the `sdd-workflow` skill and the
   `SessionStart` hook both surface automatically.

## Idempotency across restarts

Because state lives on disk, restarting Claude Code (or resuming after a
compaction) never re-triggers the same handoff — `SddEngine.sync()` only
creates a `Handoff` the first time a specification is observed complete;
afterwards it reports the already-known `handoffId` until
`claude-sdd handoff --ack <id>` acknowledges it. See
[docs/lifecycle.md](lifecycle.md#idempotency).

## Designed for a future capability

If Claude Code later adds an officially supported way for a plugin to reset
context, only the "what happens after a handoff is produced" step needs to
change (currently: emit `additionalContext` and stop). The `Handoff` model,
the engine's completion detection, and the idempotency guarantees do not
need to change at all — they were designed around "a unit of work finished
and here is what a fresh session needs", independent of how (or whether) that
fresh session gets started.
