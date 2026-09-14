import type { ProviderContext } from '../../core/models/provider.js';
import type { SddEngine } from '../../core/engine/sdd-engine.js';
import type { SddConfig } from '../../core/models/config.js';
import { SddError } from '../../utils/errors.js';
import { printJson, printLine, printError } from '../output.js';

export interface InitOptions {
  readonly id: string;
  readonly title: string | undefined;
}

export async function runInit(
  engine: SddEngine,
  ctx: ProviderContext,
  config: SddConfig,
  options: InitOptions,
  json: boolean,
): Promise<number> {
  try {
    const spec = await engine.create(ctx, config, {
      id: options.id,
      title: options.title ?? options.id,
    });

    if (json) {
      printJson(spec);
      return 0;
    }

    printLine(`Created specification "${spec.identity.id}" (${spec.identity.provider}).`);
    printLine(`  requirements: ${spec.artifacts.requirementsPath}`);
    printLine(`  design:       ${spec.artifacts.designPath}`);
    printLine(`  tasks:        ${spec.artifacts.tasksPath}`);
    return 0;
  } catch (err) {
    if (err instanceof SddError) {
      printError(err.message);
      return 1;
    }
    throw err;
  }
}
