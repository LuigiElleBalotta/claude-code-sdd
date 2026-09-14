import { SddEngine } from './core/engine/sdd-engine.js';
import { genericProvider } from './providers/generic/generic-provider.js';
import { kiroProvider } from './providers/kiro/kiro-provider.js';
/** Builds an engine with every built-in provider registered, Kiro first. */
export function createEngine() {
    const engine = new SddEngine();
    engine.registerProvider(kiroProvider);
    engine.registerProvider(genericProvider);
    return engine;
}
//# sourceMappingURL=create-engine.js.map