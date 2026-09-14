/**
 * Minimal, platform-aware argument quoting for the one narrow use case this
 * launcher needs: building a single command-line string to hand to
 * `spawn(..., { shell: true })`. Node's own docs warn against passing an
 * *array* of args together with `shell: true` (it concatenates them
 * unescaped, which is an injection risk) — the documented safer alternative
 * is to build one fully-quoted string yourself, which is what this does.
 *
 * Not a general-purpose shell escaper. It only needs to handle the argument
 * shapes this launcher actually passes: session ids, `claude` flag names,
 * and their simple values (model names, permission modes, paths without
 * exotic characters). Anything not matching the safe pattern is quoted
 * conservatively per platform rather than left to guesswork.
 */
export declare function quoteShellArg(arg: string, platform?: NodeJS.Platform): string;
export declare function buildCommandLine(command: string, args: readonly string[], platform?: NodeJS.Platform): string;
//# sourceMappingURL=shell-quote.d.ts.map