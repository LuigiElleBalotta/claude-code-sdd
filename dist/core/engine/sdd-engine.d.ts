import type { SddProvider, CreateSpecificationInput, ProviderContext } from '../models/provider.js';
import type { Specification, SpecificationStatus, SpecificationSummary } from '../models/specification.js';
import type { SddConfig } from '../models/config.js';
import type { Handoff } from '../models/handoff.js';
export interface SyncedSpecification {
    readonly summary: SpecificationSummary;
    readonly status: SpecificationStatus;
    readonly handoffId: string | undefined;
}
export interface SyncResult {
    readonly provider: string;
    readonly specs: readonly SyncedSpecification[];
    readonly active: SyncedSpecification | undefined;
    readonly handoffsCreated: readonly Handoff[];
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
     * persisted state, producing a handoff the first (and only the first) time
     * a specification is observed to have completed. Idempotent: re-running
     * with no file changes never creates a duplicate handoff, and a completed
     * specification is not reported as "active" on subsequent syncs.
     */
    sync(ctx: ProviderContext, config: SddConfig): Promise<SyncResult>;
    acknowledgeHandoff(ctx: ProviderContext, config: SddConfig, specId: string): Promise<void>;
}
//# sourceMappingURL=sdd-engine.d.ts.map