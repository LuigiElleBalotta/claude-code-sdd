import type { TaskListParseResult } from '../models/task.js';
export interface ParseTaskListOptions {
    /**
     * Heading text (without leading `#`) that starts the tasks section, e.g. "Tasks".
     * Matched case-insensitively against a Markdown ATX heading of any level (## Tasks, ### Tasks, ...).
     * Defaults to "Tasks".
     */
    readonly sectionHeading?: string;
}
/**
 * Parses a Markdown checklist under a named section (default "Tasks") into a
 * tree of tasks, using list indentation — not the task numbering text — to
 * decide what is top-level vs. a nested subtask. This is the provider-neutral
 * rule every SDD provider relies on for completion detection: only the
 * top-level entries determine whether a specification is done.
 *
 * Handles CRLF and LF line endings, ignores checkboxes outside the section,
 * tolerates malformed lines (reported as warnings, never thrown), and does
 * not care how large or unusual task numbers are since numbering is cosmetic.
 */
export declare function parseTaskList(markdown: string, options?: ParseTaskListOptions): TaskListParseResult;
//# sourceMappingURL=parse-task-list.d.ts.map