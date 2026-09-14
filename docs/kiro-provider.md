# Kiro provider

Discovers specifications by scanning `.kiro/specs/**/tasks.md` (any depth, so
`ctx.projectRoot` need not have a flat layout). For each `tasks.md` found, the
specification id is the path from `.kiro/specs/` to that file's directory,
using `/` as the separator regardless of OS.

Each specification may additionally have `requirements.md` and `design.md` in
the same directory; both are optional and read as plain Markdown.

## Completion rule

Only the **top-level** entries under a `## Tasks` heading determine
completion. Given:

```markdown
## Tasks

- [x] 1. Implement authentication
  - [x] 1.1 Create authentication service
  - [x] 1.2 Add token validation
- [x] 2. Implement authorization
  - [x] 2.1 Add roles
  - [x] 2.2 Add permissions
- [ ] 3. Add tests
  - [ ] 3.1 Unit tests
  - [ ] 3.2 Integration tests
```

The specification is **not** complete, because top-level task `3` is
unchecked — regardless of what its subtasks look like. Conversely:

```markdown
## Tasks

- [x] 1. Feature
  - [ ] 1.1 Subtask
- [x] 2. Another feature
```

**is** complete, because both top-level tasks (`1`, `2`) are checked; the
unchecked `1.1` is a subtask and is ignored for completion purposes.

This is implemented via list indentation (`core/tasks/parse-task-list.ts`),
not by parsing the numeric label, so it is unaffected by:

- task numbers greater than 9,
- duplicate or unusual numbering (`1`, `1`, `weird-label`),
- arbitrarily deep nesting,
- checkboxes anywhere else in the file (a `## Notes` section, for example) —
  those are ignored entirely,
- CRLF or LF line endings,
- a missing `## Tasks` section (treated as `draft`, not an error),
- malformed checkbox lines (reported as a warning, never thrown).

See [`tests/providers/kiro/kiro-provider.test.ts`](../tests/providers/kiro/kiro-provider.test.ts)
for the full behavioral test matrix.

## Creating a Kiro specification

`claude-sdd init <id> --title "<title>"` (with `.sdd/config.json`'s
`"provider"` set to `"kiro"`, or auto-detected because `.kiro/specs` already
exists) writes:

```
.kiro/specs/<id>/requirements.md
.kiro/specs/<id>/design.md
.kiro/specs/<id>/tasks.md
```

with a minimal scaffold in each. It refuses to overwrite an existing
specification with the same id.
