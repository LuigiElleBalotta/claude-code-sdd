/**
 * An error carrying an actionable, user-facing message. CLI entry points
 * catch this and print `message` without a stack trace; anything else is
 * treated as unexpected and prints a stack trace to aid a bug report.
 */
export declare class SddError extends Error {
    readonly code: string;
    constructor(message: string, code: string);
}
export declare function actionable(code: string, message: string): SddError;
//# sourceMappingURL=errors.d.ts.map