# Architecture

```
src/
  core/
    models/        Provider-neutral types: Specification, Task, Provider, Config, Handoff
    tasks/          parseTaskList — the one shared Markdown checklist parser both
                    providers use (indentation-based, not Kiro-specific)
    lifecycle/      Status derivation, persisted state store, handoff construction
    engine/         SddEngine — resolves a provider, orchestrates discover/read/create/sync
  providers/
    generic/        .sdd/specs/ provider (always available, zero external dependency)
    kiro/           .kiro/specs/ provider
  claude-code/
    hooks/          SessionStart / Stop hook entry points (compiled, invoked by hooks/hooks.json)
    describe-sync.ts  Turns a SyncResult into the additionalContext text hooks emit
  cli/              claude-sdd command-line entry point
  config/           .sdd/config.json loader
  utils/            fs/error helpers shared across the codebase
```

The dependency direction is one-way:

```
Claude Code  →  hooks/skills (claude-code/, skills/, hooks/)
             →  SddEngine (core/engine)
             →  SddProvider (providers/*)
             →  filesystem
```

`core/` never imports from `providers/`. Nothing under `core/` knows Kiro
exists; nothing under `providers/kiro` is reachable except through the
`SddProvider` interface defined in `core/models/provider.ts`.

## Why a shared task parser

Both providers use Markdown checklists under a `## Tasks` heading with the
same rule: indentation decides top-level vs. subtask, not the task numbering
text. That rule is generic Markdown convention, not something specific to
Kiro, so it lives once in `core/tasks/parse-task-list.ts` and both providers
call it. This avoids two parsers drifting apart and re-introducing the exact
bug the spec calls out (treating a subtask as if it were top-level).

## Adding a provider

Implement `SddProvider` (`src/core/models/provider.ts`):

```ts
interface SddProvider {
  readonly id: string;
  readonly displayName: string;
  isApplicable(ctx: ProviderContext): Promise<boolean>;
  discover(ctx: ProviderContext): Promise<SpecificationSummary[]>;
  read(ctx: ProviderContext, specId: string): Promise<Specification | undefined>;
  create(ctx: ProviderContext, input: CreateSpecificationInput): Promise<Specification>;
}
```

Then register it in `src/create-engine.ts`. If your format uses Markdown
checklists with the same top-level-only completion rule, reuse
`parseTaskList` from `core/tasks` rather than writing a new parser — see how
`providers/kiro/kiro-provider.ts` and `providers/generic/generic-provider.ts`
do it.

## The engine's job

`SddEngine` is the only thing that:

- decides which provider is active (`resolveProvider`, honoring `.sdd/config.json`'s
  `"provider"` setting, or auto-detecting Kiro vs. generic),
- overlays persisted lifecycle state on top of a provider's file-observed
  status (`sync`), so completion detection and handoff creation are
  idempotent,
- decides what counts as the "active" specification (the one in `approved` or
  `in_progress` status).

Providers never touch the state store (`.claude/sdd-state.json`) directly —
only the engine does. This keeps "did we already react to this completion"
fully separate from "what do the files say right now".
