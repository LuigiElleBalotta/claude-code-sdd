#!/usr/bin/env node
import { createEngine } from '../../create-engine.js';
import { loadConfig } from '../../config/load-config.js';
import { resolveProjectRoot, emitHookOutput, readStdin } from '../hook-context.js';
import { describeForSessionStart, describeForRestoration } from '../describe-sync.js';

/**
 * Only these reasons plausibly represent a genuinely clean context. `resume`,
 * `compact`, and `fork` all carry forward prior conversation state, so
 * declaring "fresh context restored" there would be a claim this plugin
 * cannot back up. Missing/unparseable input is treated as eligible, since
 * that is the common case (older Claude Code versions, or an empty stdin)
 * and erring toward "eligible" avoids permanently stranding a boundary.
 */
const FRESH_CONTEXT_REASONS = new Set(['startup', 'clear']);

async function readSessionStartReason(): Promise<string | undefined> {
  try {
    const raw = await readStdin();
    if (!raw) return undefined;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && 'session_start_reason' in parsed) {
      const reason = (parsed as { session_start_reason: unknown }).session_start_reason;
      return typeof reason === 'string' ? reason : undefined;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

async function main(): Promise<void> {
  const projectRoot = resolveProjectRoot();
  try {
    const reason = await readSessionStartReason();
    const isFreshContext = reason === undefined || FRESH_CONTEXT_REASONS.has(reason);

    const config = await loadConfig(projectRoot);
    const engine = createEngine();
    const ctx = { projectRoot };

    const result = await engine.sync(ctx, config);
    const lines = [describeForSessionStart(result)];

    if (isFreshContext) {
      const restored = await engine.restoreContextBoundaries(ctx);
      const restoration = describeForRestoration(restored);
      if (restoration) lines.push(restoration);
    }

    emitHookOutput('SessionStart', lines.join('\n\n'));
  } catch {
    // Hooks must never block a session. Silently emit no context on failure;
    // `claude-sdd detect` / `claude-sdd validate` surface the same problem interactively.
    emitHookOutput('SessionStart', undefined);
  }
}

void main();
