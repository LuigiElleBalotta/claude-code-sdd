import type { SddProvider, CreateSpecificationInput, ProviderContext } from '../models/provider.js';
import type { Specification, SpecificationStatus, SpecificationSummary } from '../models/specification.js';
import type { SddConfig } from '../models/config.js';
import type { Handoff } from '../models/handoff.js';
import { actionable } from '../../utils/errors.js';
import { buildHandoff, buildHandoffId } from '../lifecycle/build-handoff.js';
import { loadState, saveState, recordKey, type SddState, type SpecRecord } from '../lifecycle/state-store.js';

export interface SyncedSpecification {
  readonly summary: SpecificationSummary;
  readonly status: SpecificationStatus;
  readonly handoffId: string | undefined;
}

export interface SyncResult {
  readonly provider: string;
  readonly specs: readonly SyncedSpecification[];
  readonly active: SyncedSpecification | undefined;
  readonly handoffsCreated: readonly Handoff[];
}

const ACTIVE_STATUSES: readonly SpecificationStatus[] = ['approved', 'in_progress'];

export class SddEngine {
  private readonly providers = new Map<string, SddProvider>();

  registerProvider(provider: SddProvider): void {
    this.providers.set(provider.id, provider);
  }

  listProviders(): readonly SddProvider[] {
    return [...this.providers.values()];
  }

  async resolveProvider(ctx: ProviderContext, config: SddConfig): Promise<SddProvider> {
    if (config.provider !== 'auto') {
      const provider = this.providers.get(config.provider);
      if (!provider) {
        throw actionable('UNKNOWN_PROVIDER', `Unknown SDD provider "${config.provider}" in .sdd/config.json.`);
      }
      return provider;
    }

    for (const provider of this.providers.values()) {
      if (provider.id === 'generic') continue; // generic is the fallback, tried last
      if (await provider.isApplicable(ctx)) return provider;
    }

    const generic = this.providers.get('generic');
    if (!generic) {
      throw actionable('NO_PROVIDER', 'No SDD provider is registered (expected at least the generic provider).');
    }
    return generic;
  }

  async discover(ctx: ProviderContext, config: SddConfig): Promise<SpecificationSummary[]> {
    const provider = await this.resolveProvider(ctx, config);
    return provider.discover(ctx);
  }

  async read(ctx: ProviderContext, config: SddConfig, specId: string): Promise<Specification | undefined> {
    const provider = await this.resolveProvider(ctx, config);
    return provider.read(ctx, specId);
  }

  async create(ctx: ProviderContext, config: SddConfig, input: CreateSpecificationInput): Promise<Specification> {
    const provider = await this.resolveProvider(ctx, config);
    const spec = await provider.create(ctx, input);

    const state = await loadState(ctx.projectRoot);
    const key = recordKey(provider.id, spec.identity.id);
    const nextState: SddState = {
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
  async sync(ctx: ProviderContext, config: SddConfig): Promise<SyncResult> {
    const provider = await this.resolveProvider(ctx, config);
    const summaries = await provider.discover(ctx);
    const state = await loadState(ctx.projectRoot);
    const specs: SyncedSpecification[] = [];
    const handoffsCreated: Handoff[] = [];
    const nextSpecs: Record<string, SpecRecord> = { ...state.specs };
    const now = new Date();

    for (const summary of summaries) {
      const key = recordKey(provider.id, summary.identity.id);
      const existing = nextSpecs[key];
      let status = summary.status;
      let handoffId = existing?.handoffId;

      if (summary.status === 'completed') {
        if (existing?.status === 'handoff_pending' || existing?.status === 'handoff_completed') {
          status = existing.status;
        } else {
          const full = await provider.read(ctx, summary.identity.id);
          if (full && config.handoffNotifications) {
            const id = buildHandoffId(full, now);
            handoffsCreated.push(buildHandoff(full, id, now));
            handoffId = id;
          }
          status = 'handoff_pending';
        }
      } else if (existing && (existing.status === 'handoff_pending' || existing.status === 'handoff_completed')) {
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

  async acknowledgeHandoff(ctx: ProviderContext, config: SddConfig, specId: string): Promise<void> {
    const provider = await this.resolveProvider(ctx, config);
    const state = await loadState(ctx.projectRoot);
    const key = recordKey(provider.id, specId);
    const existing = state.specs[key];
    if (!existing) {
      throw actionable('SPEC_NOT_FOUND', `No tracked specification "${specId}" for provider "${provider.id}".`);
    }
    if (existing.status !== 'handoff_pending' && existing.status !== 'handoff_completed') {
      throw actionable(
        'NOT_HANDOFF_PENDING',
        `Specification "${specId}" has no pending handoff to acknowledge (status: ${existing.status}).`,
      );
    }
    await saveState(ctx.projectRoot, {
      version: 1,
      specs: { ...state.specs, [key]: { ...existing, status: 'handoff_completed', updatedAt: new Date().toISOString() } },
    });
  }
}
