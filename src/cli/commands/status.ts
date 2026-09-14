import type { ProviderContext } from '../../core/models/provider.js';
import type { SddEngine } from '../../core/engine/sdd-engine.js';
import type { SddConfig } from '../../core/models/config.js';
import { printJson, printLine } from '../output.js';

export async function runStatus(
  engine: SddEngine,
  ctx: ProviderContext,
  config: SddConfig,
  json: boolean,
): Promise<number> {
  const result = await engine.sync(ctx, config);

  if (json) {
    printJson(result);
    return 0;
  }

  if (result.specs.length === 0) {
    printLine('No specifications found. Use "claude-sdd init <name>" to create one.');
    return 0;
  }

  for (const spec of result.specs) {
    const s = spec.summary;
    printLine(
      `[${spec.status}] ${s.identity.provider}:${s.identity.id} — "${s.title}" ` +
        `(${s.completedTopLevelTasks}/${s.totalTopLevelTasks} top-level tasks)`,
    );
  }

  if (result.active) {
    printLine(`\nActive specification: ${result.active.summary.identity.id}`);
  } else {
    printLine('\nNo active specification.');
  }

  for (const handoff of result.handoffsCreated) {
    printLine(`\nHandoff ready: ${handoff.summary}`);
    printLine(`Run "claude-sdd handoff --ack ${handoff.specification.id}" once reviewed.`);
  }

  return 0;
}
