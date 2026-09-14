---
description: Show Spec-Driven Development specification status and progress
disable-model-invocation: true
---

Run `claude-sdd status --json` with the Bash tool from the project root, then
present the result to the user as a concise, readable summary (specifications
found, their status, top-level task progress, and the active specification if
any). Do not reinterpret or recompute anything beyond formatting the JSON for
readability — the CLI is the source of truth.
