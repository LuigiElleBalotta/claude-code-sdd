import type { SpecificationIdentity } from './specification.js';
/**
 * A handoff is the artifact produced when a specification reaches completion.
 * It is persisted (`SpecRecord.handoff` in `core/lifecycle/state-store.ts`)
 * so a later process — a fresh session's `SessionStart` hook, potentially
 * started by a launcher — can present it without having witnessed the
 * `sync()` call that created it.
 *
 * Whether it has been "consumed" (acknowledged, or restored into a fresh
 * session) is tracked by the specification's `SpecificationStatus`
 * (`handoff_completed` / `handoff_restored`), not by a field here — this
 * object only ever describes the completion event itself.
 */
export interface Handoff {
    readonly id: string;
    readonly specification: SpecificationIdentity;
    readonly createdAt: string;
    readonly summary: string;
    readonly nextSteps: readonly string[];
}
//# sourceMappingURL=handoff.d.ts.map