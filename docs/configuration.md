# Configuration

Optional file: `.sdd/config.json` at the project root. Every field has a
sensible default, so most projects need no config file at all.

```json
{
  "provider": "auto",
  "handoffNotifications": true,
  "autoContextBoundary": true
}
```

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `provider` | `"auto"` \| `"kiro"` \| `"generic"` | `"auto"` | Which provider to use. `"auto"` uses Kiro if `.kiro/specs` exists, otherwise the generic provider. |
| `handoffNotifications` | `boolean` | `true` | Whether the engine reacts to a specification completing at all: produces a `Handoff` and advances its status past `completed`. `false` is a pure opt-out — completion is still detected and reported by `claude-sdd status`, but nothing is ever produced or persisted for it. |
| `autoContextBoundary` | `boolean` | `true` | Whether a newly-produced handoff immediately requests a context boundary (`completed` → `context_boundary`, restored automatically the next time a fresh session starts — see [docs/lifecycle.md](lifecycle.md)), or stops at `handoff_pending` for a manual `claude-sdd handoff --ack` instead (the pre-0.2 behavior). Only meaningful when `handoffNotifications` is `true`. |

`autoContextBoundary` does not itself start or stop any process. It only
decides which status a completion lands on. Something still has to act on
`context_boundary`: a human starting a fresh Claude Code session (works with
no further setup), or [`claude-sdd launch`](launcher.md) doing it
automatically (opt-in, managed mode).

Malformed JSON, an unrecognized `provider` value, or a non-boolean
`handoffNotifications` / `autoContextBoundary` fails loudly with an
actionable error (`CONFIG_MALFORMED` / `CONFIG_INVALID_PROVIDER` /
`CONFIG_INVALID_FIELD`) rather than silently falling back, since a broken
config that's silently ignored is harder to debug than one that errors
immediately.

## Local state file

`.claude/sdd-state.json` (documented in the [README](../README.md#local-state))
is separate from configuration — it is state the engine writes, not
something you're expected to hand-edit. It is written atomically (a
temp-file-then-rename, never a partial write a concurrent reader such as
`claude-sdd launch`'s watcher could observe mid-write) and contains no
secrets and no machine-specific paths, so it is safe to commit or to
gitignore, whichever your team prefers for tracking handoff history.
