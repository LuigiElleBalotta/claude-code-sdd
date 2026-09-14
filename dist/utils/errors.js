/**
 * An error carrying an actionable, user-facing message. CLI entry points
 * catch this and print `message` without a stack trace; anything else is
 * treated as unexpected and prints a stack trace to aid a bug report.
 */
export class SddError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'SddError';
    }
}
export function actionable(code, message) {
    return new SddError(message, code);
}
//# sourceMappingURL=errors.js.map