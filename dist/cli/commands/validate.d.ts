import type { ProviderContext } from '../../core/models/provider.js';
import type { SddEngine } from '../../core/engine/sdd-engine.js';
import type { SddConfig } from '../../core/models/config.js';
export interface ValidationIssue {
    readonly specId: string;
    readonly line: number | undefined;
    readonly message: string;
}
export declare function runValidate(engine: SddEngine, ctx: ProviderContext, config: SddConfig, json: boolean): Promise<number>;
//# sourceMappingURL=validate.d.ts.map