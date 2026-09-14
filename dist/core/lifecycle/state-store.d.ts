import type { SpecificationStatus } from '../models/specification.js';
export interface SpecRecord {
    readonly status: SpecificationStatus;
    readonly handoffId: string | undefined;
    readonly updatedAt: string;
}
export interface SddState {
    readonly version: 1;
    readonly specs: Record<string, SpecRecord>;
}
export declare function emptyState(): SddState;
export declare function statePathFor(projectRoot: string): string;
export declare function loadState(projectRoot: string): Promise<SddState>;
export declare function saveState(projectRoot: string, state: SddState): Promise<void>;
export declare function recordKey(providerId: string, specId: string): string;
export declare function stateFileExists(projectRoot: string): Promise<boolean>;
//# sourceMappingURL=state-store.d.ts.map