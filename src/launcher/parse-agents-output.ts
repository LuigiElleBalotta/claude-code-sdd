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
