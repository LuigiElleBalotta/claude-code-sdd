import { actionable } from '../../utils/errors.js';
import { buildHandoff, buildHandoffId } from '../lifecycle/build-handoff.js';
import { loadState, saveState, recordKey } from '../lifecycle/state-store.js';
const ACTIVE_STATUSES = ['approved', 'in_progress'];
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
                [key]: { status: spec.status, handoffId: undefined, updatedAt: new Date().toISOString() },
            },
        };
        await saveState(ctx.projectRoot, nextState);
        return spec;
    }
    /**
     * Reconciles every discovered specification's file-observed status against
     * persisted state, producing a handoff the first (and only the first) time
     * a specification is observed to have completed. Idempotent: re-running
     * with no file changes never creates a duplicate handoff, and a completed
     * specification is not reported as "active" on subsequent syncs.
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
            let handoffId = existing?.handoffId;
            if (summary.status === 'completed') {
                if (existing?.status === 'handoff_pending' || existing?.status === 'handoff_completed') {
                    status = existing.status;
                }
                else {
                    const full = await provider.read(ctx, summary.identity.id);
                    if (full && config.handoffNotifications) {
                        const id = buildHandoffId(full, now);
                        handoffsCreated.push(buildHandoff(full, id, now));
                        handoffId = id;
                    }
                    status = 'handoff_pending';
                }
            }
            else if (existing && (existing.status === 'handoff_pending' || existing.status === 'handoff_completed')) {
                // Files regressed below "completed" (e.g. a task was unchecked) — resume tracking normally.
                handoffId = undefined;
            }
            nextSpecs[key] = { status, handoffId, updatedAt: now.toISOString() };
            specs.push({ summary, status, handoffId });
        }
        await saveState(ctx.projectRoot, { version: 1, specs: nextSpecs });
        const active = specs.find((s) => ACTIVE_STATUSES.includes(s.status));
        return { provider: provider.id, specs, active, handoffsCreated };
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
            throw actionable('NOT_HANDOFF_PENDING', `Specification "${specId}" has no pending handoff to acknowledge (status: ${existing.status}).`);
        }
        await saveState(ctx.projectRoot, {
            version: 1,
            specs: { ...state.specs, [key]: { ...existing, status: 'handoff_completed', updatedAt: new Date().toISOString() } },
        });
    }
}
//# sourceMappingURL=sdd-engine.js.map