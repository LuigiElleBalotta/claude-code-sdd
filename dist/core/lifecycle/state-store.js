import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { pathExists, readFileIfExists } from '../../utils/fs.js';
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
        typeof parsed.specs !== 'object' ||
        parsed.specs === null) {
        throw actionable('STATE_MALFORMED', `${filePath} does not match the expected SDD state schema. Fix or delete it and retry.`);
    }
    // Intentionally lenient per-record: a record missing `handoff` (an older
    // state shape, or one written by a future version) is valid — it just
    // means "no persisted handoff", not a schema violation. This keeps the
    // state file forward/backward tolerant without a migration step.
    const specs = parsed.specs;
    return { version: STATE_VERSION, specs: specs ?? {} };
}
/**
 * Writes the state file atomically: a torn/partial write must never be
 * observable by a concurrent reader (a launcher watching `.claude/` for
 * changes, in particular). Writes to a sibling temp file and renames it into
 * place — `rename` within the same directory is atomic on Windows, macOS,
 * and Linux.
 */
export async function saveState(projectRoot, state) {
    const filePath = statePathFor(projectRoot);
    await mkdir(path.dirname(filePath), { recursive: true });
    const tempPath = path.join(path.dirname(filePath), `.sdd-state.${randomUUID()}.tmp`);
    await writeFile(tempPath, JSON.stringify(state, null, 2) + '\n', 'utf8');
    await rename(tempPath, filePath);
}
export function recordKey(providerId, specId) {
    return `${providerId}:${specId}`;
}
export async function stateFileExists(projectRoot) {
    return pathExists(statePathFor(projectRoot));
}
//# sourceMappingURL=state-store.js.map