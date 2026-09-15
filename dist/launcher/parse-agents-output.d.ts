/**
 * Parsing helpers isolated from process-spawning so they can be unit tested
 * with plain strings.
 *
 * `claude --bg`'s real stdout (confirmed against the installed binary) looks
 * like:
 *
 *   backgrounded · 11b6a0fe
 *     claude agents             list sessions
 *     claude attach 11b6a0fe    open in this terminal
 *     claude logs 11b6a0fe      show recent output
 *     claude stop 11b6a0fe      stop this session
 *
 * `extractSessionIdFromBgOutput` reads the id straight out of that text and
 * is the primary path. `extractSessionId` (cross-checking against
 * `claude agents --json`) is kept as a fallback for output that doesn't
 * match the shape above, but the happy path no longer depends on
 * `agents --json` succeeding — it shouldn't gate on a second command when
 * the id was already printed by the first one.
 */
/**
 * Extracts the session id directly from `claude --bg`'s own stdout/stderr,
 * anchoring on the `backgrounded` line and the `claude attach <id>` hint
 * line (ASCII tokens, not the `·` separator, which is cosmetic). If both
 * anchors are present they must agree; if only one is present it is used
 * as-is; otherwise this returns undefined rather than guessing.
 */
export declare function extractSessionIdFromBgOutput(output: string): string | undefined;
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