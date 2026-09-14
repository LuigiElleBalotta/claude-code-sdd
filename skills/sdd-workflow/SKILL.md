---
description: Use when starting non-trivial development work (new features, significant behavior changes, architectural changes, complex refactors, or anything with real requirements/design decisions) to decide whether to create or continue a Spec-Driven Development (SDD) specification before implementing. Also use when an SDD specification already exists and work should follow it.
---

# Spec-Driven Development (SDD)

This repository has `claude-code-sdd` installed. It understands Spec-Driven
Development through a provider-neutral engine — Kiro (`.kiro/specs/`) is the
first supported provider, and a generic provider (`.sdd/specs/`) is always
available as a fallback, so SDD works even in repositories that don't use Kiro.

## When to use SDD

Use a specification for: new features, significant behavior changes,
architectural changes, complex or multi-file refactors, or any change with
meaningful requirements or acceptance criteria.

Do **not** use SDD for trivial changes: typo fixes, formatting-only changes,
one-line fixes, obvious documentation corrections, or simple dependency
version bumps that need no design.

## Workflow

1. Run `claude-sdd status` (Bash tool) to see whether a specification is
   already active. If one is active and relevant to the request, continue it
   rather than starting a new one.
2. If no relevant specification exists and the work is non-trivial, create one
   with `claude-sdd init <spec-id> --title "<title>"`, then fill in
   `requirements.md` and `design.md` for that specification before writing
   implementation code.
3. Define the implementation task list in `tasks.md` under a `## Tasks`
   heading, as a Markdown checklist. Follow the project's own approval
   process (if any) before implementing.
4. Implement according to the task list, checking off top-level tasks (and
   their subtasks, if useful for tracking) as they complete.
5. A specification is complete only when every **top-level** task is checked.
   Nested subtasks are organizational detail — they help track progress but
   never independently mark the specification done or block its completion.
6. When a specification's last top-level task completes, a `Stop`-hook notice
   reports that a context boundary has been requested (status
   `context_boundary`, persisted). Tell the user the SDD work unit is
   complete. If the project runs under `claude-sdd launch` (managed mode),
   the boundary is enforced automatically — this session will be stopped and
   a fresh one started for you, with nothing further to do. Otherwise,
   recommend the user start a fresh Claude Code session; the next session's
   own startup will automatically report the restored handoff. Either way,
   never claim a context reset happened from inside this hook/skill — only
   a session that has actually (re)started can say that, and it will say so
   itself.

Trivial changes never need any of this — just make them directly.
