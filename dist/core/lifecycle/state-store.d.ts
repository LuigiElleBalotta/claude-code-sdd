import type { SpecificationStatus } from '../models/specification.js';
import type { Handoff } from '../models/handoff.js';
export interface SpecRecord {
    readonly status: SpecificationStatus;
    /**
     * The full handoff produced when this specification completed, persisted
     * (not just its id) so a later process — a fresh session's SessionStart
     * hook, or a launcher — can present it without having witnessed the
     * `sync()` call that created it. Absent for specifications that never
     * completed, or whose state predates this field (tolerated, not migrated).
     */
    readonly handoff: Handoff | undefined;
    readonly updatedAt: string;
}
export interface SddState {
    readonly version: 1;
    readonly specs: Record<string, SpecRecord>;
}
export declare function emptyState(): SddState;
export declare function statePathFor(projectRoot: string): string;
export declare function loadState(projectRoot: string): Promise<SddState>;
/**
 * Writes the state file atomically: a torn/partial write must never be
 * observable by a concurrent reader (a launcher watching `.claude/` for
 * changes, in particular). Writes to a sibling temp file and renames it into
 * place — `rename` within the same directory is atomic on Windows, macOS,
 * and Linux.
 */
export declare function saveState(projectRoot: string, state: SddState): Promise<void>;
export declare function recordKey(providerId: string, specId: string): string;
export declare function stateFileExists(projectRoot: string): Promise<boolean>;
//# sourceMappingURL=state-store.d.ts.map