import type { ProviderContext } from '../../core/models/provider.js';
import type { SddEngine } from '../../core/engine/sdd-engine.js';
import type { SddConfig } from '../../core/models/config.js';
export interface InitOptions {
    readonly id: string;
    readonly title: string | undefined;
}
export declare function runInit(engine: SddEngine, ctx: ProviderContext, config: SddConfig, options: InitOptions, json: boolean): Promise<number>;
//# sourceMappingURL=init.d.ts.map