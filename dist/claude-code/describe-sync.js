const POLICY = [
    'This repository supports Spec-Driven Development (SDD) via claude-code-sdd.',
    'For non-trivial work (new features, significant behavior changes, architectural changes, complex refactors), continue an active specification if one exists, or create one before implementing: define requirements, then design, then an implementation task list, then follow the project\'s approval workflow before writing code.',
    'Trivial changes (typos, formatting, one-line fixes, obvious doc corrections, simple version bumps) do not need a specification.',
    'A specification is complete only when every TOP-LEVEL task in its task list is done; nested subtasks are organizational and do not independently determine completion.',
].join(' ');
const TERMINAL_STATUSES = ['handoff_pending', 'context_boundary', 'handoff_completed', 'handoff_restored'];
export function describeForSessionStart(result) {
    const lines = [POLICY];
    if (result.specs.length === 0) {
        lines.push('No specifications currently exist in this repository.');
        return lines.join('\n');
    }
    lines.push(`Provider in use: ${result.provider}.`);
    const pendingBoundary = result.specs.filter((s) => s.status === 'context_boundary');
    if (pendingBoundary.length > 0) {
        lines.push(`${pendingBoundary.length} specification(s) completed and are waiting for a context boundary: ` +
            pendingBoundary.map((s) => s.summary.identity.id).join(', ') +
            '. If this session is not itself the fresh session that should consume them (e.g. this is a resumed session), leave them as-is.');
    }
    if (result.active) {
        const s = result.active.summary;
        lines.push(`Active specification: "${s.identity.id}" (${s.title}) — status ${result.active.status}, ` +
            `${s.completedTopLevelTasks}/${s.totalTopLevelTasks} top-level tasks complete. Continue this specification for related work.`);
    }
    else {
        const terminal = result.specs.filter((s) => TERMINAL_STATUSES.includes(s.status));
        if (terminal.length === result.specs.length) {
            lines.push('All existing specifications are complete. Create a new one before starting non-trivial new work.');
        }
        else {
            lines.push('No specification is currently active.');
        }
    }
    return lines.join('\n');
}
/**
 * The `Stop`-hook notice. `sync()` never advances a specification past
 * `context_boundary` on its own, so this only ever announces that a boundary
 * has been *requested* — never that context was actually reset (that would
 * be a claim this plugin cannot back up from inside a hook).
 */
export function describeForStop(result) {
    if (result.handoffsCreated.length === 0)
        return undefined;
    const lines = ['SDD specification(s) completed:'];
    for (const handoff of result.handoffsCreated) {
        lines.push(`- ${handoff.summary}`);
    }
    lines.push('A context boundary has been requested and is persisted in .claude/sdd-state.json. ' +
        'If this project is running under "claude-sdd launch" (managed mode), the boundary will be enforced automatically: ' +
        'this session will be stopped and a fresh one started, which will report the handoff. ' +
        'Otherwise, tell the user directly and plainly, e.g.: "This specification is complete. You can run /clear now — ' +
        'the next session will automatically report the handoff and what remains, if anything, before you start the next task." ' +
        'Do not run /clear yourself and do not claim it already happened — only the user can do this, and only from their own input.');
    return lines.join('\n');
}
/**
 * The message a fresh session's `SessionStart` hook emits after
 * `restoreContextBoundaries` finds and consumes one or more pending
 * boundaries. This is the only place this plugin claims "fresh context
 * restored" — because this is the one hook event that only fires when a new
 * session has, in fact, started.
 */
export function describeForRestoration(restored) {
    if (restored.length === 0)
        return undefined;
    const lines = ['Fresh context started. SDD handoff restored:'];
    for (const { identity, handoff } of restored) {
        if (handoff) {
            lines.push(`- ${identity.provider}:${identity.id} — ${handoff.summary}`);
            for (const step of handoff.nextSteps) {
                lines.push(`  - ${step}`);
            }
        }
        else {
            lines.push(`- ${identity.provider}:${identity.id} completed (no handoff details were persisted).`);
        }
    }
    lines.push('Tell the user this specification is complete and summarize what remains, if anything, from the next steps above.');
    return lines.join('\n');
}
//# sourceMappingURL=describe-sync.js.map