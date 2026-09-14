import type { ProviderContext } from '../../core/models/provider.js';
import type { SddEngine } from '../../core/engine/sdd-engine.js';
import type { SddConfig } from '../../core/models/config.js';
import { printJson, printLine } from '../output.js';

export async function runDetect(
  engine: SddEngine,
  ctx: ProviderContext,
  config: SddConfig,
  json: boolean,
): Promise<number> {
  const applicability: Record<string, boolean> = {};
  for (const provider of engine.listProviders()) {
    applicability[provider.id] = await provider.isApplicable(ctx);
  }
  const resolved = await engine.resolveProvider(ctx, config);
  const specs = await engine.discover(ctx, config);

  if (json) {
    printJson({ resolvedProvider: resolved.id, providers: applicability, specCount: specs.length });
    return 0;
  }

  printLine(`SDD is available. Resolved provider: ${resolved.displayName} (${resolved.id})`);
  for (const [id, applicable] of Object.entries(applicability)) {
    printLine(`  - ${id}: ${applicable ? 'detected' : 'not present'}`);
  }
  printLine(`Specifications found: ${specs.length}`);
  return 0;
}
