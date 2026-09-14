# Example project instructions

If your project wants to document its SDD policy statically — for example in
a project `CLAUDE.md` — in addition to (or instead of) relying on this
plugin's own `sdd-workflow` skill and hooks, here is a concise, English-only
example to adapt. It intentionally does not encode any Kiro- or
Mindicity-specific rules; adapt the "approval workflow" line to whatever your
project actually does.

```markdown
# Spec-Driven Development

This repository uses Spec-Driven Development for non-trivial changes.

Before implementing a new feature, significant behavior change,
architectural change, or complex refactoring:

1. Create or update an SDD specification (`claude-sdd init <id>`, or continue
   an existing one — check with `claude-sdd status`).
2. Define the requirements.
3. Define the technical design.
4. Define the implementation tasks.
5. Follow the project's approval workflow.
6. Implement according to the task list.
7. Mark tasks complete as work progresses.

Trivial changes (typos, formatting, one-line fixes, obvious documentation
corrections, simple version bumps) do not require a specification.

A specification is complete when all top-level implementation tasks are
complete. Nested subtasks are organizational and do not independently
determine specification completion.

If no specification exists for a non-trivial request, create one.
```
