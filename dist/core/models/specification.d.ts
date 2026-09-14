import type { TaskListParseResult } from './task.js';
/**
 * Provider-neutral specification lifecycle.
 *
 * `draft` / `approved` / `in_progress` / `completed` are recomputed from the
 * specification's files every time (see `core/lifecycle/derive-status.ts`).
 * The remaining three are a persisted overlay recording how this project has
 * already reacted to completion — see `core/lifecycle/README` section in
 * `docs/lifecycle.md` for the full state diagram:
 *
 * - `handoff_pending` — a handoff was produced but automatic context-boundary
 *   requesting is disabled (`autoContextBoundary: false`); waits for a manual
 *   `claude-sdd handoff --ack`. Terminal successor: `handoff_completed`.
 * - `context_boundary` — a handoff was produced and a context boundary has
 *   been requested (the default). Waits for a **new** session to start
 *   (whichever mechanism causes that — the user manually, or a managed
 *   launcher). Terminal successor: `handoff_restored`.
 * - `handoff_completed` / `handoff_restored` are both terminal: the
 *   specification is no longer "active" and further completions of the same
 *   specification never re-enter either pending state unless its tasks
 *   regress below `completed` first.
 */
export type SpecificationStatus = 'draft' | 'approved' | 'in_progress' | 'completed' | 'handoff_pending' | 'context_boundary' | 'handoff_completed' | 'handoff_restored';
export interface SpecificationIdentity {
    /** Stable slug, unique within a provider (e.g. directory name). */
    readonly id: string;
    readonly provider: string;
}
export interface SpecificationArtifacts {
    readonly requirementsPath: string | undefined;
    readonly designPath: string | undefined;
    readonly tasksPath: string | undefined;
}
export interface Specification {
    readonly identity: SpecificationIdentity;
    readonly title: string;
    readonly artifacts: SpecificationArtifacts;
    readonly requirements: string | undefined;
    readonly design: string | undefined;
    readonly tasks: TaskListParseResult;
    /** File-observed status only. The persisted overlay (handoff/boundary state) lives in `SyncedSpecification`, not here. */
    readonly status: SpecificationStatus;
}
export interface SpecificationSummary {
    readonly identity: SpecificationIdentity;
    readonly title: string;
    readonly status: SpecificationStatus;
    readonly totalTopLevelTasks: number;
    readonly completedTopLevelTasks: number;
}
export declare function summarize(spec: Specification): SpecificationSummary;
//# sourceMappingURL=specification.d.ts.map