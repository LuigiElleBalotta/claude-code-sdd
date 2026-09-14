export function resolveProjectRoot() {
    return process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
}
/** Hooks must never block or crash the session; always exit 0 with best-effort output. */
export async function readStdin() {
    if (process.stdin.isTTY)
        return '';
    const chunks = [];
    for await (const chunk of process.stdin) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf8');
}
export function emitHookOutput(hookEventName, additionalContext) {
    const output = {};
    if (additionalContext) {
        output.hookSpecificOutput = { hookEventName, additionalContext };
    }
    process.stdout.write(JSON.stringify(output));
}
//# sourceMappingURL=hook-context.js.map