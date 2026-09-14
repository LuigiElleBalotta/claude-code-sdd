import path from 'node:path';
import { summarize } from '../../core/models/specification.js';
import { deriveBaseStatus } from '../../core/lifecycle/derive-status.js';
import { parseTaskList } from '../../core/tasks/parse-task-list.js';
import { listDirsIfExists, pathExists, readFileIfExists, writeFileEnsuringDir } from '../../utils/fs.js';
import { actionable } from '../../utils/errors.js';
export const GENERIC_SPECS_DIR = path.join('.sdd', 'specs');
export const GENERIC_PROVIDER_ID = 'generic';
function specDir(projectRoot, specId) {
    return path.join(projectRoot, GENERIC_SPECS_DIR, specId);
}
function deriveTitle(specId, requirements) {
    if (requirements) {
        const heading = /^#\s+(.+)$/m.exec(requirements);
        if (heading?.[1])
            return heading[1].trim();
    }
    return specId;
}
async function readSpecification(projectRoot, specId) {
    const dir = specDir(projectRoot, specId);
    if (!(await pathExists(dir)))
        return undefined;
    const requirementsPath = path.join(dir, 'requirements.md');
    const designPath = path.join(dir, 'design.md');
    const tasksPath = path.join(dir, 'tasks.md');
    const [requirements, design, tasksRaw] = await Promise.all([
        readFileIfExists(requirementsPath),
        readFileIfExists(designPath),
        readFileIfExists(tasksPath),
    ]);
    const tasks = parseTaskList(tasksRaw ?? '');
    const status = deriveBaseStatus({
        hasRequirements: requirements !== undefined,
        hasDesign: design !== undefined,
        tasks,
    });
    return {
        identity: { id: specId, provider: GENERIC_PROVIDER_ID },
        title: deriveTitle(specId, requirements),
        artifacts: {
            requirementsPath: requirements !== undefined ? requirementsPath : undefined,
            designPath: design !== undefined ? designPath : undefined,
            tasksPath: tasksRaw !== undefined ? tasksPath : undefined,
        },
        requirements,
        design,
        tasks,
        status,
    };
}
export const genericProvider = {
    id: GENERIC_PROVIDER_ID,
    displayName: 'Generic (.sdd/specs)',
    async isApplicable(ctx) {
        return pathExists(path.join(ctx.projectRoot, GENERIC_SPECS_DIR));
    },
    async discover(ctx) {
        const root = path.join(ctx.projectRoot, GENERIC_SPECS_DIR);
        const ids = await listDirsIfExists(root);
        const summaries = [];
        for (const id of ids.sort()) {
            const spec = await readSpecification(ctx.projectRoot, id);
            if (spec)
                summaries.push(summarize(spec));
        }
        return summaries;
    },
    async read(ctx, specId) {
        return readSpecification(ctx.projectRoot, specId);
    },
    async create(ctx, input) {
        const dir = specDir(ctx.projectRoot, input.id);
        if (await pathExists(dir)) {
            throw actionable('SPEC_EXISTS', `A specification named "${input.id}" already exists at ${dir}.`);
        }
        const requirements = input.requirements ?? `# ${input.title}\n\n## Requirements\n\n- TBD\n`;
        const design = input.design ?? `# ${input.title} — Design\n\n## Overview\n\n- TBD\n`;
        const tasksBody = input.tasksBody ?? '- [ ] 1. TBD\n';
        const tasks = `# ${input.title} — Tasks\n\n## Tasks\n\n${tasksBody}`;
        await Promise.all([
            writeFileEnsuringDir(path.join(dir, 'requirements.md'), requirements),
            writeFileEnsuringDir(path.join(dir, 'design.md'), design),
            writeFileEnsuringDir(path.join(dir, 'tasks.md'), tasks),
        ]);
        const spec = await readSpecification(ctx.projectRoot, input.id);
        if (!spec) {
            throw actionable('SPEC_CREATE_FAILED', `Failed to create specification "${input.id}".`);
        }
        return spec;
    },
};
//# sourceMappingURL=generic-provider.js.map