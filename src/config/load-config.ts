import path from 'node:path';
import { readFileIfExists } from '../utils/fs.js';
import { actionable } from '../utils/errors.js';
import { mergeConfig, type SddConfig } from '../core/models/config.js';

export function configPathFor(projectRoot: string): string {
  return path.join(projectRoot, '.sdd', 'config.json');
}

export async function loadConfig(projectRoot: string): Promise<SddConfig> {
  const filePath = configPathFor(projectRoot);
  const raw = await readFileIfExists(filePath);
  if (raw === undefined) return mergeConfig(undefined);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw actionable('CONFIG_MALFORMED', `${filePath} is not valid JSON.`);
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw actionable('CONFIG_MALFORMED', `${filePath} must contain a JSON object.`);
  }

  const candidate = parsed as Partial<SddConfig>;
  if (candidate.provider !== undefined && !['auto', 'kiro', 'generic'].includes(candidate.provider)) {
    throw actionable(
      'CONFIG_INVALID_PROVIDER',
      `${filePath}: "provider" must be one of "auto", "kiro", "generic" (got ${JSON.stringify(candidate.provider)}).`,
    );
  }

  return mergeConfig(candidate);
}
