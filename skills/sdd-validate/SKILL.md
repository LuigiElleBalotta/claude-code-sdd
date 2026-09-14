---
description: Validate the structure of Spec-Driven Development specifications
disable-model-invocation: true
---

Run `claude-sdd validate --json` with the Bash tool from the project root and
report any structural issues found (missing `## Tasks` sections, empty task
lists, malformed checkbox lines) with their specification id and line number.
If there are no issues, say so plainly. Do not treat this as a code review —
it only checks SDD artifact structure.
