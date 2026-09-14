import type { SddProvider, CreateSpecificationInput, ProviderContext } from '../models/provider.js';
import type { Specification, SpecificationIdentity, SpecificationStatus, SpecificationSummary } from '../models/specification.js';
import type { SddConfig } from '../models/config.js';
import type { Handoff } from '../models/handoff.js';
export interface SyncedSpecification {
    readonly summary: SpecificationSummary;
    readonly status: SpecificationStatus;
    readonly handoff: Handoff | undefined;
}
export interface SyncResult {
    readonly provider: string;
    readonly specs: readonly SyncedSpecification[];
    readonly active: SyncedSpecification | undefined;
    readonly handoffsCreated: readonly Handoff[];
}
export interface RestoredHandoff {
    readonly identity: SpecificationIdentity;
    readonly handoff: Handoff | undefined;
}
export declare class SddEngine {
    private readonly providers;
    registerProvider(provider: SddProvider): void;
    listProviders(): readonly SddProvider[];
    resolveProvider(ctx: ProviderContext, config: SddConfig): Promise<SddProvider>;
    discover(ctx: ProviderContext, config: SddConfig): Promise<SpecificationSummary[]>;
    read(ctx: ProviderContext, config: SddConfig, specId: string): Promise<Specification | undefined>;
    create(ctx: ProviderContext, config: SddConfig, input: CreateSpecificationInput): Promise<Specification>;
    /**
     * Reconciles every discovered specification's file-observed status against
     * persisted state. The only thing this method ever does past "completed"
     * is: the FIRST time a specification is observed complete, produce a
     * `Handoff` and land on `handoff_pending` (manual mode) or
     * `context_boundary` (the default — a boundary has been requested).
     *
     * Deliberately never advances `context_boundary` -> `handoff_restored`:
     * that transition means "a new session has actually started", which only
     * `restoreContextBoundaries` (called from `SessionStart`) is entitled to
     * declare. `sync()` runs on every `Stop`, so if it self-promoted boundaries
     * it would falsely mark a still-running session's own pending boundary as
     * restored the moment the user sent another message.
     */
    sync(ctx: ProviderContext, config: SddConfig): Promise<SyncResult>;
    /**
     * Declares that a NEW session has started and consumes every specification
     * currently at `context_boundary` for it: `context_boundary` ->
     * `handoff_restored` (terminal). Idempotent — a specification already at
     * `handoff_restored` is returned as already-restored, never re-restored,
     * and calling this with no launcher ever having run works identically to
     * calling it right after one did (nothing here depends on how or whether a
     * process was restarted, only on what the persisted state says).
     *
     * Callers: the `SessionStart` hook, and only for a start reason that
     * plausibly represents a clean context (`startup` / `clear` — see
     * `src/claude-code/hooks/session-start.ts`). Never called from `sync()`.
     */
    restoreContextBoundaries(ctx: ProviderContext): Promise<RestoredHandoff[]>;
    acknowledgeHandoff(ctx: ProviderContext, config: SddConfig, specId: string): Promise<void>;
}
//# sourceMappingURL=sdd-engine.d.ts.map