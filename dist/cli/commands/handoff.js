import { SddError } from '../../utils/errors.js';
import { printJson, printLine, printError } from '../output.js';
export async function runHandoff(engine, ctx, config, ack, json) {
    if (ack) {
        try {
            await engine.acknowledgeHandoff(ctx, config, ack);
        }
        catch (err) {
            if (err instanceof SddError) {
                printError(err.message);
                return 1;
            }
            throw err;
        }
        if (json) {
            printJson({ acknowledged: ack });
        }
        else {
            printLine(`Handoff for "${ack}" acknowledged.`);
        }
        return 0;
    }
    const result = await engine.sync(ctx, config);
    const pending = result.specs.filter((s) => s.status === 'handoff_pending');
    if (json) {
        printJson({ pending, handoffsCreated: result.handoffsCreated });
        return 0;
    }
    if (pending.length === 0 && result.handoffsCreated.length === 0) {
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
    for (const spec of pending) {
        printLine(`Pending handoff: ${spec.summary.identity.id} (run with --ack ${spec.summary.identity.id} to clear)`);
    }
    return 0;
}
//# sourceMappingURL=handoff.js.map