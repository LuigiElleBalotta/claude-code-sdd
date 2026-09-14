import type { Specification } from '../models/specification.js';
import type { Handoff } from '../models/handoff.js';

export function buildHandoffId(spec: Specification, now: Date): string {
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  return `${spec.identity.provider}-${spec.identity.id}-${stamp}`;
}

export function buildHandoff(spec: Specification, id: string, now: Date): Handoff {
  const total = spec.tasks.topLevel.length;
  return {
    id,
    specification: spec.identity,
    createdAt: now.toISOString(),
    summary: `Specification "${spec.title}" (${spec.identity.provider}:${spec.identity.id}) has all ${total} top-level task(s) complete.`,
    nextSteps: [
      'Review the implementation against the specification before merging.',
      'Start a fresh Claude Code session (context reset is not something this plugin can trigger automatically) to continue with a clean context.',
      `Run "claude-sdd handoff --ack ${spec.identity.id}" once you have reviewed this handoff, so it is not repeated.`,
    ],
    acknowledged: false,
  };
}
