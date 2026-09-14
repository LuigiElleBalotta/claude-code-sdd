# Contributing

## Setup

```bash
npm install
```

## Development loop

```bash
npm run typecheck   # tsc --noEmit
npm run lint         # eslint
npm test             # vitest
npm run build        # tsc -> dist/
npm run validate     # all of the above, in order (also runs on prepublishOnly)
```

`npm run build` output (`dist/`) is committed to this repository on purpose:
Claude Code plugin installs (via a marketplace `github`/`git` source) clone
the repository as-is with no build step, and the `hooks/hooks.json` entries
invoke the compiled hook scripts directly. **If you change anything under
`src/`, run `npm run build` and commit the resulting `dist/` changes in the
same commit.** CI fails the build if `dist/` is out of date (see
`.github/workflows/ci.yml`).

## Project layout

See [docs/architecture.md](docs/architecture.md).

## Adding a provider

See [docs/architecture.md#adding-a-provider](docs/architecture.md#adding-a-provider).
Please add it under `src/providers/<name>/`, register it in
`src/create-engine.ts`, and add a test file under `tests/providers/<name>/`
covering at least: discovery, reading, creation, an incomplete specification,
a completed specification, and malformed input.

## Testing the plugin locally in Claude Code

```bash
claude --plugin-dir /path/to/this/repo
```

Then try `/claude-code-sdd:sdd-status`, `/claude-code-sdd:sdd-init`,
`/claude-code-sdd:sdd-validate`, `/claude-code-sdd:sdd-handoff`, and ask
Claude to do something non-trivial to see the `sdd-workflow` skill and the
`SessionStart`/`Stop` hooks engage.

Run `claude plugin validate .` before opening a PR that changes the plugin
manifest, skills, or hooks.

## Testing the launcher (`claude-sdd launch`)

**Never run `claude --bg` / `claude attach` / `claude-sdd launch` from inside
a Claude Code session (including via the Bash tool)** — it starts a real
background Claude Code session, i.e. a nested Claude process. `claude-sdd
launch`'s `CLAUDECODE` guard exists to prevent exactly this, but **`--force`
genuinely bypasses it and genuinely spawns a real session** — this isn't
theoretical, it happened once during this project's own development (while
testing argument parsing, not the launcher itself) and had to be cleaned up
with `claude stop <id>` + `claude rm <id>`; see
[docs/context-boundaries.md](docs/context-boundaries.md) for the full
account. Don't pass `--force` to "just test it" from inside a session, ever.

Instead:

- Test the restart *decision logic* in
  `src/launcher/launcher-state-machine.ts` with plain unit tests against a
  fake `SessionHost` (see `tests/launcher/launcher-state-machine.test.ts`) —
  it has zero process/filesystem code and needs no real `claude` process.
- Test parsing helpers (`src/launcher/parse-agents-output.ts`) with plain
  strings (see `tests/launcher/parse-agents-output.test.ts`).
- If you need to verify `RealSessionHost` or the full restart cycle against
  a real background session, do it from your own top-level shell, outside
  any Claude Code session, and expect to spend real wall-clock time — it is
  not part of the automated test suite for exactly the reason above.

## Commit / PR expectations

- Keep `core/` provider-neutral. If a change only makes sense for one
  provider, it belongs in `providers/<that-provider>/`, not `core/`.
- Tests are required for any change to task parsing, status derivation, or
  the engine's completion/idempotency logic — that logic is the whole point
  of this project.
- No telemetry, no network calls, no new runtime dependencies without a good
  reason (the project currently has zero runtime dependencies).
