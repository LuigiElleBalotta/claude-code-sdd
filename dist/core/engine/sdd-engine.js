import { actionable } from '../../utils/errors.js';
import { buildHandoff, buildHandoffId } from '../lifecycle/build-handoff.js';
import { loadState, saveState, recordKey } from '../lifecycle/state-store.js';
const ACTIVE_STATUSES = ['approved', 'in_progress'];
/** Statuses that only exist as a persisted overlay on top of a file-observed "completed". */
const OVERLAY_STATUSES = [
    'handoff_pending',
    'context_boundary',
    'handoff_completed',
    'handoff_restored',
];
export class SddEngine {
    providers = new Map();
    registerProvider(provider) {
        this.providers.set(provider.id, provider);
    }
    listProviders() {
        return [...this.providers.values()];
    }
    async resolveProvider(ctx, config) {
        if (config.provider !== 'auto') {
            const provider = this.providers.get(config.provider);
            if (!provider) {
                throw actionable('UNKNOWN_PROVIDER', `Unknown SDD provider "${config.provider}" in .sdd/config.json.`);
            }
            return provider;
        }
        for (const provider of this.providers.values()) {
            if (provider.id === 'generic')
                continue; // generic is the fallback, tried last
            if (await provider.isApplicable(ctx))
                return provider;
        }
        const generic = this.providers.get('generic');
        if (!generic) {
            throw actionable('NO_PROVIDER', 'No SDD provider is registered (expected at least the generic provider).');
        }
        return generic;
    }
    async discover(ctx, config) {
        const provider = await this.resolveProvider(ctx, config);
        return provider.discover(ctx);
    }
    async read(ctx, config, specId) {
        const provider = await this.resolveProvider(ctx, config);
        return provider.read(ctx, specId);
    }
    async create(ctx, config, input) {
        const provider = await this.resolveProvider(ctx, config);
        const spec = await provider.create(ctx, input);
        const state = await loadState(ctx.projectRoot);
        const key = recordKey(provider.id, spec.identity.id);
        const nextState = {
            version: 1,
            specs: {
                ...state.specs,
                [key]: { status: spec.status, handoff: undefined, updatedAt: new Date().toISOString() },
            },
        };
        await saveState(ctx.projectRoot, nextState);
        return spec;
    }
    /**
     * Reconciles every discovered specification's file-observed status against
     * persisted state. The only thing this method ever does past "completed"
     * is: the FIRST time a specification is observed complete, produce a
     * `Handoff` and land on `handoff_pending` (manual mode) or
     * `context_boundary` (the default — a boundary has been requested).
     *
     * Deliberately never advances `context_boundary` -> `handoff_restored`:
     * that transition means "a new session has actually started", which only
     * `restoreContextBoundaries` (called from `SessionStart`) is entitled to
     * declare. `sync()` runs on every `Stop`, so if it self-promoted boundaries
     * it would falsely mark a still-running session's own pending boundary as
     * restored the moment the user sent another message.
     */
    async sync(ctx, config) {
        const provider = await this.resolveProvider(ctx, config);
        const summaries = await provider.discover(ctx);
        const state = await loadState(ctx.projectRoot);
        const specs = [];
        const handoffsCreated = [];
        const nextSpecs = { ...state.specs };
        const now = new Date();
        for (const summary of summaries) {
            const key = recordKey(provider.id, summary.identity.id);
            const existing = nextSpecs[key];
            let status = summary.status;
            let handoff = existing?.handoff;
            if (summary.status === 'completed') {
                if (existing && OVERLAY_STATUSES.includes(existing.status)) {
                    // Already reacted to this completion (or an earlier one still
                    // pending) — never re-create a handoff or re-request a boundary.
                    status = existing.status;
                }
                else if (config.handoffNotifications) {
                    const full = await provider.read(ctx, summary.identity.id);
                    if (full) {
                        const id = buildHandoffId(full, now);
                        const created = buildHandoff(full, id, now);
                        handoffsCreated.push(created);
                        handoff = created;
                    }
                    status = config.autoContextBoundary ? 'context_boundary' : 'handoff_pending';
                }
                else {
                    status = 'completed';
                }
            }
            else if (existing && OVERLAY_STATUSES.includes(existing.status)) {
                // Files regressed below "completed" (a top-level task was
                // unchecked again) — drop the stale handoff and resume normal
                // tracking from whatever the files now say.
                handoff = undefined;
            }
            nextSpecs[key] = { status, handoff, updatedAt: now.toISOString() };
            specs.push({ summary, status, handoff });
        }
        await saveState(ctx.projectRoot, { version: 1, specs: nextSpecs });
        const active = specs.find((s) => ACTIVE_STATUSES.includes(s.status));
        return { provider: provider.id, specs, active, handoffsCreated };
    }
    /**
     * Declares that a NEW session has started and consumes every specification
     * currently at `context_boundary` for it: `context_boundary` ->
     * `handoff_restored` (terminal). Idempotent — a specification already at
     * `handoff_restored` is returned as already-restored, never re-restored,
     * and calling this with no launcher ever having run works identically to
     * calling it right after one did (nothing here depends on how or whether a
     * process was restarted, only on what the persisted state says).
     *
     * Callers: the `SessionStart` hook, and only for a start reason that
     * plausibly represents a clean context (`startup` / `clear` — see
     * `src/claude-code/hooks/session-start.ts`). Never called from `sync()`.
     */
    async restoreContextBoundaries(ctx) {
        const state = await loadState(ctx.projectRoot);
        const restored = [];
        const nextSpecs = { ...state.specs };
        let changed = false;
        const now = new Date().toISOString();
        for (const [key, record] of Object.entries(state.specs)) {
            if (record.status !== 'context_boundary')
                continue;
            const [provider, ...rest] = key.split(':');
            const identity = { provider: provider ?? 'unknown', id: rest.join(':') };
            nextSpecs[key] = { ...record, status: 'handoff_restored', updatedAt: now };
            restored.push({ identity, handoff: record.handoff });
            changed = true;
        }
        if (changed) {
            await saveState(ctx.projectRoot, { version: 1, specs: nextSpecs });
        }
        return restored;
    }
    async acknowledgeHandoff(ctx, config, specId) {
        const provider = await this.resolveProvider(ctx, config);
        const state = await loadState(ctx.projectRoot);
        const key = recordKey(provider.id, specId);
        const existing = state.specs[key];
        if (!existing) {
            throw actionable('SPEC_NOT_FOUND', `No tracked specification "${specId}" for provider "${provider.id}".`);
        }
        if (existing.status !== 'handoff_pending' && existing.status !== 'handoff_completed') {
            throw actionable('NOT_HANDOFF_PENDING', `Specification "${specId}" has no pending handoff to acknowledge (status: ${existing.status}). ` +
                `"context_boundary" specifications are restored automatically by starting a fresh session, not acknowledged.`);
        }
        await saveState(ctx.projectRoot, {
            version: 1,
            specs: {
                ...state.specs,
                [key]: { ...existing, status: 'handoff_completed', updatedAt: new Date().toISOString() },
            },
        });
    }
}
//# sourceMappingURL=sdd-engine.js.map