import { SddError } from '../../utils/errors.js';
import { printJson, printLine, printError } from '../output.js';
export async function runInit(engine, ctx, config, options, json) {
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
    }
    catch (err) {
        if (err instanceof SddError) {
            printError(err.message);
            return 1;
        }
        throw err;
    }
}
//# sourceMappingURL=init.js.map