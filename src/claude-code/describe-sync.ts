import type { SyncResult } from '../core/engine/sdd-engine.js';

const POLICY = [
  'This repository supports Spec-Driven Development (SDD) via claude-code-sdd.',
  'For non-trivial work (new features, significant behavior changes, architectural changes, complex refactors), continue an active specification if one exists, or create one before implementing: define requirements, then design, then an implementation task list, then follow the project\'s approval workflow before writing code.',
  'Trivial changes (typos, formatting, one-line fixes, obvious doc corrections, simple version bumps) do not need a specification.',
  'A specification is complete only when every TOP-LEVEL task in its task list is done; nested subtasks are organizational and do not independently determine completion.',
].join(' ');

export function describeForSessionStart(result: SyncResult): string {
  const lines = [POLICY];

  if (result.specs.length === 0) {
    lines.push('No specifications currently exist in this repository.');
    return lines.join('\n');
  }

  lines.push(`Provider in use: ${result.provider}.`);

  if (result.active) {
    const s = result.active.summary;
    lines.push(
      `Active specification: "${s.identity.id}" (${s.title}) — status ${result.active.status}, ` +
        `${s.completedTopLevelTasks}/${s.totalTopLevelTasks} top-level tasks complete. Continue this specification for related work.`,
    );
  } else {
    const completed = result.specs.filter((s) => s.status === 'handoff_pending' || s.status === 'handoff_completed');
    if (completed.length === result.specs.length) {
      lines.push('All existing specifications are complete. Create a new one before starting non-trivial new work.');
    } else {
      lines.push('No specification is currently active.');
    }
  }

  return lines.join('\n');
}

export function describeForStop(result: SyncResult): string | undefined {
  if (result.handoffsCreated.length === 0) return undefined;

  const lines = ['SDD context boundary reached:'];
  for (const handoff of result.handoffsCreated) {
    lines.push(`- ${handoff.summary}`);
  }
  lines.push(
    'Claude Code has no supported way for a plugin to reset context automatically. ' +
      'Tell the user this SDD work unit is complete and that starting a fresh session (e.g. /clear) is recommended before continuing with unrelated work. ' +
      'Run "claude-sdd handoff --ack <spec-id>" once this has been communicated, so it is not repeated.',
  );
  return lines.join('\n');
}
