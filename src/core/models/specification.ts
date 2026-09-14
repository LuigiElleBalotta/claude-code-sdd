import type { TaskListParseResult } from './task.js';

/**
 * Provider-neutral specification lifecycle.
 *
 * Transitions are strictly forward except that `in_progress` can be re-entered
 * from `approved` as tasks are worked, and `handoff_completed` is terminal.
 * See {@link nextStatus} in `core/lifecycle` for the allowed transitions.
 */
export type SpecificationStatus =
  | 'draft'
  | 'approved'
  | 'in_progress'
  | 'completed'
  | 'handoff_pending'
  | 'handoff_completed';

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
  readonly status: SpecificationStatus;
  /** Set once handoff has been produced for this specification's completion. */
  readonly handoffId: string | undefined;
}

export interface SpecificationSummary {
  readonly identity: SpecificationIdentity;
  readonly title: string;
  readonly status: SpecificationStatus;
  readonly totalTopLevelTasks: number;
  readonly completedTopLevelTasks: number;
}

export function summarize(spec: Specification): SpecificationSummary {
  const topLevel = spec.tasks.topLevel;
  return {
    identity: spec.identity,
    title: spec.title,
    status: spec.status,
    totalTopLevelTasks: topLevel.length,
    completedTopLevelTasks: topLevel.filter((t) => t.done).length,
  };
}
