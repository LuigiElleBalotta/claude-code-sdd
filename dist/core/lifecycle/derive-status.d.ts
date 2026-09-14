import type { TaskListParseResult } from '../models/task.js';
import type { SpecificationStatus } from '../models/specification.js';
export interface DerivableSpecInputs {
    readonly hasRequirements: boolean;
    readonly hasDesign: boolean;
    readonly tasks: TaskListParseResult;
}
/**
 * Deterministically derives a specification's file-observable status:
 * `draft` (no tasks defined yet), `approved` (tasks defined, none started),
 * `in_progress` (some top-level tasks done, not all), or `completed` (every
 * top-level task done). `handoff_pending` / `handoff_completed` are not
 * file-observable — they are overlaid by the engine using persisted state,
 * since they represent "have we already reacted to completion", not a fact
 * about the specification's content.
 */
export declare function deriveBaseStatus(inputs: DerivableSpecInputs): SpecificationStatus;
//# sourceMappingURL=derive-status.d.ts.map