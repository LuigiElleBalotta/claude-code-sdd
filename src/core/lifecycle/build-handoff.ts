import type { Specification } from '../models/specification.js';
import type { Handoff } from '../models/handoff.js';

export function buildHandoffId(spec: Specification, now: Date): string {
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  return `${spec.identity.provider}-${spec.identity.id}-${stamp}`;
}

/**
 * `nextSteps` deliberately covers only the SPECIFICATION's own follow-up
 * (what's left to do about the work itself), not session/context mechanics —
 * this same `Handoff` is persisted and re-surfaced later, potentially by a
 * completely different process (a fresh session, possibly started by a
 * launcher), so instructions here must stay correct regardless of *how* that
 * fresh context came about. How to reach a fresh context at all is described
 * separately, and only at the moment it's actually true, by
 * `describeForStop` / `describeForRestoration` in `claude-code/describe-sync.ts`.
 */
export function buildHandoff(spec: Specification, id: string, now: Date): Handoff {
  const total = spec.tasks.topLevel.length;
  return {
    id,
    specification: spec.identity,
    createdAt: now.toISOString(),
    summary: `Specification "${spec.title}" (${spec.identity.provider}:${spec.identity.id}) has all ${total} top-level task(s) complete.`,
    nextSteps: [
      'Review the implementation against the specification before merging.',
      'Create a new specification for the next unit of work, if any.',
    ],
  };
}
