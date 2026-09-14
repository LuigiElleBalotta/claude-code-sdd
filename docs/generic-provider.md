# Generic provider

The default fallback when no other provider's structure is present. Requires
nothing beyond this plugin — no external tool, no specific IDE.

```
.sdd/specs/<spec-id>/
  requirements.md
  design.md
  tasks.md
```

- `<spec-id>` is a directory name directly under `.sdd/specs/` (single level;
  use the Kiro provider, or a future nested-aware provider, if you need
  arbitrarily nested spec ids).
- `tasks.md` uses the same checklist format and the same top-level-only
  completion rule as Kiro — see [docs/kiro-provider.md](kiro-provider.md#completion-rule).
  Both providers call the same shared parser
  (`core/tasks/parse-task-list.ts`), so behavior is identical by construction,
  not by coincidence.
- The specification's title is taken from the first `# Heading` in
  `requirements.md`, falling back to the spec id if there isn't one.

## Creating a specification

`claude-sdd init <id> --title "<title>"` writes all three files with a
minimal scaffold:

```markdown
# <title>

## Requirements

- TBD
```

```markdown
# <title> — Design

## Overview

- TBD
```

```markdown
# <title> — Tasks

## Tasks

- [ ] 1. TBD
```

It refuses to overwrite an existing specification with the same id
(`SPEC_EXISTS`).
