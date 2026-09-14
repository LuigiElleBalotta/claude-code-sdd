import path from 'node:path';
import { pathExists, readFileIfExists, writeFileEnsuringDir } from '../../utils/fs.js';
import { actionable } from '../../utils/errors.js';
const STATE_VERSION = 1;
export function emptyState() {
    return { version: STATE_VERSION, specs: {} };
}
export function statePathFor(projectRoot) {
    return path.join(projectRoot, '.claude', 'sdd-state.json');
}
export async function loadState(projectRoot) {
    const filePath = statePathFor(projectRoot);
    const raw = await readFileIfExists(filePath);
    if (raw === undefined)
        return emptyState();
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        throw actionable('STATE_MALFORMED', `${filePath} is not valid JSON. Fix or delete it (it is local, disposable state) and retry.`);
    }
    if (typeof parsed !== 'object' ||
        parsed === null ||
        !('specs' in parsed) ||
        typeof parsed.specs !== 'object') {
        throw actionable('STATE_MALFORMED', `${filePath} does not match the expected SDD state schema. Fix or delete it and retry.`);
    }
    const specs = parsed.specs;
    return { version: STATE_VERSION, specs: specs ?? {} };
}
export async function saveState(projectRoot, state) {
    const filePath = statePathFor(projectRoot);
    await writeFileEnsuringDir(filePath, JSON.stringify(state, null, 2) + '\n');
}
export function recordKey(providerId, specId) {
    return `${providerId}:${specId}`;
}
export async function stateFileExists(projectRoot) {
    return pathExists(statePathFor(projectRoot));
}
//# sourceMappingURL=state-store.js.map