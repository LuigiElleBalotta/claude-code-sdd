import type { Specification } from '../models/specification.js';
import type { Handoff } from '../models/handoff.js';
export declare function buildHandoffId(spec: Specification, now: Date): string;
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
export declare function buildHandoff(spec: Specification, id: string, now: Date): Handoff;
//# sourceMappingURL=build-handoff.d.ts.map