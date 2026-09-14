/**
 * An error carrying an actionable, user-facing message. CLI entry points
 * catch this and print `message` without a stack trace; anything else is
 * treated as unexpected and prints a stack trace to aid a bug report.
 */
export class SddError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'SddError';
  }
}

export function actionable(code: string, message: string): SddError {
  return new SddError(message, code);
}
