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
export function extractSessionIdFromBgOutput(output: string): string | undefined {
  const backgroundedMatch = output.match(/backgrounded\W+([A-Za-z0-9]+)/);
  const attachMatch = output.match(/claude\s+attach\s+([A-Za-z0-9]+)/);
  const backgroundedId = backgroundedMatch?.[1];
  const attachId = attachMatch?.[1];

  if (backgroundedId && attachId) {
    return backgroundedId === attachId ? backgroundedId : undefined;
  }
  return backgroundedId ?? attachId;
}

/**
 * Finds which of `knownIds` appears in `output` (typically the captured
 * stdout/stderr of the `claude --bg` invocation that just created a new
 * session). Returns the id only if exactly one candidate matches — an empty
 * or ambiguous match is deliberately not resolved here.
 */
export function extractSessionId(output: string, knownIds: readonly string[]): string | undefined {
  const matches = knownIds.filter((id) => id.length > 0 && output.includes(id));
  return matches.length === 1 ? matches[0] : undefined;
}

/**
 * Extracts session ids from `claude agents --json` output. Tolerates a few
 * plausible shapes (a bare array of id strings, or an array of objects
 * carrying `id` / `sessionId` / `session_id`) since the exact schema was not
 * verified against a live invocation.
 */
export function extractIdsFromAgentsJson(raw: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  const list = Array.isArray(parsed) ? parsed : Array.isArray((parsed as { agents?: unknown })?.agents) ? (parsed as { agents: unknown[] }).agents : undefined;
  if (!list) return [];

  const ids: string[] = [];
  for (const entry of list) {
    if (typeof entry === 'string') {
      ids.push(entry);
      continue;
    }
    if (typeof entry === 'object' && entry !== null) {
      const record = entry as Record<string, unknown>;
      const id = record.id ?? record.sessionId ?? record.session_id;
      if (typeof id === 'string') ids.push(id);
    }
  }
  return ids;
}
