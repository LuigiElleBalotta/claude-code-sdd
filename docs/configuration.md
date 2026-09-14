# Configuration

Optional file: `.sdd/config.json` at the project root. Every field has a
sensible default, so most projects need no config file at all.

```json
{
  "provider": "auto",
  "handoffNotifications": true
}
```

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `provider` | `"auto"` \| `"kiro"` \| `"generic"` | `"auto"` | Which provider to use. `"auto"` uses Kiro if `.kiro/specs` exists, otherwise the generic provider. |
| `handoffNotifications` | `boolean` | `true` | Whether the `Stop` hook emits a notice (and the engine produces a `Handoff` record) when a specification completes. Discovery, status, and completion detection still work with this `false` — only the proactive notice is suppressed. |

Malformed JSON, or an unrecognized `provider` value, fails loudly with an
actionable error (`CONFIG_MALFORMED` / `CONFIG_INVALID_PROVIDER`) rather than
silently falling back, since a broken config that's silently ignored is
harder to debug than one that errors immediately.

## Local state file

`.claude/sdd-state.json` (documented in the [README](../README.md#local-state))
is separate from configuration — it is state the engine writes, not
something you're expected to hand-edit. It contains no secrets and no
machine-specific paths, so it is safe to commit or to gitignore, whichever
your team prefers for tracking handoff history.
