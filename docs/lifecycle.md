# Lifecycle

A specification moves through these statuses:

| Status | Meaning | How it's determined |
| --- | --- | --- |
| `draft` | No tasks defined yet (or no tasks section at all) | File-observed |
| `approved` | Tasks defined, none started | File-observed |
| `in_progress` | Some but not all top-level tasks done | File-observed |
| `completed` | Every top-level task done | File-observed |
| `handoff_pending` | Completed, and a handoff has been produced but not acknowledged | Persisted overlay |
| `handoff_completed` | Handoff acknowledged | Persisted overlay |

The first four are recomputed from the specification's files every time
(`draft`/`approved`/`in_progress`/`completed` — see
[`core/lifecycle/derive-status.ts`](../src/core/lifecycle/derive-status.ts)).
`handoff_pending` and `handoff_completed` are not file-observable — they
record "have we already reacted to this completion", which lives in
`.claude/sdd-state.json`, not in the specification's own files.

## Idempotency

`SddEngine.sync()` is the only place that transitions a specification into
`handoff_pending`, and it only does so the first time it observes
`completed` for a given specification (tracked by `<provider>:<spec-id>` key
in the state file). Running `sync` again with no file changes:

- does not create a second handoff,
- keeps reporting the same `handoffId`,
- does not report the specification as "active" (only `approved` /
  `in_progress` count as active).

If a top-level task is unchecked again after completion (someone reopens
work), the next `sync` drops the handoff and resumes normal tracking from
whatever the files now say — it does not stay stuck in `handoff_pending`.

`acknowledgeHandoff` is the only transition into `handoff_completed`; it
fails with an actionable error if there is no pending handoff for that
specification, so it can't be called twice by accident to hide a real
regression.

## Approval gate

Section 10 of this project's own spec calls for a "project-defined approval
gate" between design and implementation. v0.1 does not encode a specific gate
mechanism (a required review, a manual sign-off command, etc.) — that is
intentionally left to each project's own process, since gates vary widely.
`approved` status (tasks defined, none started) is the natural point at which
a project should apply whatever gate it uses before work begins.
