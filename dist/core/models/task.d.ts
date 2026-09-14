/**
 * Provider-neutral task model.
 *
 * Completion semantics (shared by every provider): a specification is complete
 * when every TOP-LEVEL task is done. Nested subtasks are organizational detail
 * and never independently determine completion — see {@link isTaskListComplete}.
 */
export interface TaskNode {
    /** Task number/label as written in the source (e.g. "1", "2.3"), if present. */
    readonly label: string | undefined;
    readonly title: string;
    readonly done: boolean;
    readonly children: readonly TaskNode[];
    /** 1-based source line number, for diagnostics. */
    readonly line: number;
}
export interface TaskParseWarning {
    readonly line: number;
    readonly message: string;
}
export interface TaskListParseResult {
    /** Only the top-level tasks. Completion must be computed from this list alone. */
    readonly topLevel: readonly TaskNode[];
    readonly warnings: readonly TaskParseWarning[];
    /** True if a recognizable tasks section was found at all. */
    readonly sectionFound: boolean;
}
export declare function countAllTasks(nodes: readonly TaskNode[]): number;
/**
 * A specification is complete only when every top-level task is done.
 * An empty top-level list is never "complete" — it means no tasks were
 * defined yet, which is not the same as done.
 */
export declare function isTaskListComplete(topLevel: readonly TaskNode[]): boolean;
export interface TaskProgress {
    readonly totalTopLevel: number;
    readonly completedTopLevel: number;
    readonly complete: boolean;
}
export declare function computeTaskProgress(topLevel: readonly TaskNode[]): TaskProgress;
//# sourceMappingURL=task.d.ts.map