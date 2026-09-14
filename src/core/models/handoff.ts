import type { SpecificationIdentity } from './specification.js';

/**
 * A handoff is the artifact produced when a specification reaches completion.
 *
 * Claude Code has no officially supported way for a plugin to programmatically
 * clear or reset conversation context (see docs/context-boundaries.md). A
 * handoff therefore never claims to reset anything — it only records that a
 * unit of SDD work finished, and persists what a fresh session needs in order
 * to continue safely from a clean context.
 */
export interface Handoff {
  readonly id: string;
  readonly specification: SpecificationIdentity;
  readonly createdAt: string;
  readonly summary: string;
  readonly nextSteps: readonly string[];
  /** True once a human/Claude has acknowledged the handoff (idempotency marker). */
  readonly acknowledged: boolean;
}
