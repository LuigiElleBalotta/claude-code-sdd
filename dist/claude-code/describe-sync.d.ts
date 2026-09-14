import type { RestoredHandoff, SyncResult } from '../core/engine/sdd-engine.js';
export declare function describeForSessionStart(result: SyncResult): string;
/**
 * The `Stop`-hook notice. `sync()` never advances a specification past
 * `context_boundary` on its own, so this only ever announces that a boundary
 * has been *requested* — never that context was actually reset (that would
 * be a claim this plugin cannot back up from inside a hook).
 */
export declare function describeForStop(result: SyncResult): string | undefined;
/**
 * The message a fresh session's `SessionStart` hook emits after
 * `restoreContextBoundaries` finds and consumes one or more pending
 * boundaries. This is the only place this plugin claims "fresh context
 * restored" — because this is the one hook event that only fires when a new
 * session has, in fact, started.
 */
export declare function describeForRestoration(restored: readonly RestoredHandoff[]): string | undefined;
//# sourceMappingURL=describe-sync.d.ts.map