import type { ProviderContext } from '../../core/models/provider.js';
import type { SddEngine } from '../../core/engine/sdd-engine.js';
import type { SddConfig } from '../../core/models/config.js';
import { SddError } from '../../utils/errors.js';
import { printJson, printLine, printError } from '../output.js';

export async function runHandoff(
  engine: SddEngine,
  ctx: ProviderContext,
  config: SddConfig,
  ack: string | undefined,
  json: boolean,
): Promise<number> {
  if (ack) {
    try {
      await engine.acknowledgeHandoff(ctx, config, ack);
    } catch (err) {
      if (err instanceof SddError) {
        printError(err.message);
        return 1;
      }
      throw err;
    }
    if (json) {
      printJson({ acknowledged: ack });
    } else {
      printLine(`Handoff for "${ack}" acknowledged.`);
    }
    return 0;
  }

  const result = await engine.sync(ctx, config);
  const pendingAck = result.specs.filter((s) => s.status === 'handoff_pending');
  const pendingBoundary = result.specs.filter((s) => s.status === 'context_boundary');

  if (json) {
    printJson({ pendingAck, pendingBoundary, handoffsCreated: result.handoffsCreated });
    return 0;
  }

  if (pendingAck.length === 0 && pendingBoundary.length === 0 && result.handoffsCreated.length === 0) {
    printLine('No pending handoffs.');
    return 0;
  }

  for (const handoff of result.handoffsCreated) {
    printLine(`Handoff for "${handoff.specification.id}":`);
    printLine(`  ${handoff.summary}`);
    for (const step of handoff.nextSteps) {
      printLine(`  - ${step}`);
    }
  }
  for (const spec of pendingAck) {
    printLine(`Pending handoff: ${spec.summary.identity.id} (run with --ack ${spec.summary.identity.id} to clear)`);
  }
  for (const spec of pendingBoundary) {
    printLine(
      `Context boundary requested: ${spec.summary.identity.id} ` +
        '(restored automatically by the next fresh session, or by "claude-sdd launch")',
    );
  }
  return 0;
}
