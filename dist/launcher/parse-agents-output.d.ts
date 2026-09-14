/**
 * Parsing helpers isolated from process-spawning so they can be unit tested
 * with plain strings. The exact stdout format of `claude --bg` and the exact
 * JSON shape of `claude agents --json` were not established by live-testing
 * a real background session from inside this environment (doing so would
 * start a real nested Claude Code session — see docs/context-boundaries.md
 * for why that was avoided). Both parsers are deliberately lenient and fail
 * by returning nothing rather than guessing, so the caller can surface an
 * actionable error instead of attaching to the wrong session.
 */
/**
 * Finds which of `knownIds` appears in `output` (typically the captured
 * stdout/stderr of the `claude --bg` invocation that just created a new
 * session). Returns the id only if exactly one candidate matches — an empty
 * or ambiguous match is deliberately not resolved here.
 */
export declare function extractSessionId(output: string, knownIds: readonly string[]): string | undefined;
/**
 * Extracts session ids from `claude agents --json` output. Tolerates a few
 * plausible shapes (a bare array of id strings, or an array of objects
 * carrying `id` / `sessionId` / `session_id`) since the exact schema was not
 * verified against a live invocation.
 */
export declare function extractIdsFromAgentsJson(raw: string): string[];
//# sourceMappingURL=parse-agents-output.d.ts.map