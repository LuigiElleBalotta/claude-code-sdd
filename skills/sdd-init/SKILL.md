---
description: Create a new Spec-Driven Development specification
argument-hint: <spec-id> [title]
disable-model-invocation: true
---

Create a new SDD specification for "$ARGUMENTS" by running
`claude-sdd init <spec-id> --title "<title>" --json` with the Bash tool
(choose a short kebab-case `<spec-id>` from the request; use the rest of the
text as the title). Then open the generated `requirements.md` and help the
user fill in real requirements — do not leave it as a placeholder. The CLI
decides where the files live (Kiro or generic layout); do not hard-code paths.
