import type { ProviderContext } from '../../core/models/provider.js';
import type { SddEngine } from '../../core/engine/sdd-engine.js';
import type { SddConfig } from '../../core/models/config.js';
export declare function runHandoff(engine: SddEngine, ctx: ProviderContext, config: SddConfig, ack: string | undefined, json: boolean): Promise<number>;
//# sourceMappingURL=handoff.d.ts.map