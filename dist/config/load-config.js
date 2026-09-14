import path from 'node:path';
import { readFileIfExists } from '../utils/fs.js';
import { actionable } from '../utils/errors.js';
import { mergeConfig } from '../core/models/config.js';
export function configPathFor(projectRoot) {
    return path.join(projectRoot, '.sdd', 'config.json');
}
export async function loadConfig(projectRoot) {
    const filePath = configPathFor(projectRoot);
    const raw = await readFileIfExists(filePath);
    if (raw === undefined)
        return mergeConfig(undefined);
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        throw actionable('CONFIG_MALFORMED', `${filePath} is not valid JSON.`);
    }
    if (typeof parsed !== 'object' || parsed === null) {
        throw actionable('CONFIG_MALFORMED', `${filePath} must contain a JSON object.`);
    }
    const candidate = parsed;
    if (candidate.provider !== undefined && !['auto', 'kiro', 'generic'].includes(candidate.provider)) {
        throw actionable('CONFIG_INVALID_PROVIDER', `${filePath}: "provider" must be one of "auto", "kiro", "generic" (got ${JSON.stringify(candidate.provider)}).`);
    }
    for (const field of ['handoffNotifications', 'autoContextBoundary']) {
        if (candidate[field] !== undefined && typeof candidate[field] !== 'boolean') {
            throw actionable('CONFIG_INVALID_FIELD', `${filePath}: "${field}" must be a boolean.`);
        }
    }
    return mergeConfig(candidate);
}
//# sourceMappingURL=load-config.js.map