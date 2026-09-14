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
export function quoteShellArg(arg, platform = process.platform) {
    if (arg.length === 0)
        return platform === 'win32' ? '""' : "''";
    if (/^[A-Za-z0-9_@%+=:,./-]+$/.test(arg))
        return arg;
    if (platform === 'win32') {
        // cmd.exe: wrap in double quotes, double any embedded double quotes.
        return `"${arg.replace(/"/g, '""')}"`;
    }
    // POSIX sh: wrap in single quotes, ending/re-opening around any embedded single quote.
    return `'${arg.replace(/'/g, `'\\''`)}'`;
}
export function buildCommandLine(command, args, platform = process.platform) {
    return [command, ...args].map((part) => quoteShellArg(part, platform)).join(' ');
}
//# sourceMappingURL=shell-quote.js.map