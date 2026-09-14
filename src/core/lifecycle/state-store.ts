import path from 'node:path';
import type { SpecificationStatus } from '../models/specification.js';
import { pathExists, readFileIfExists, writeFileEnsuringDir } from '../../utils/fs.js';
import { actionable } from '../../utils/errors.js';

export interface SpecRecord {
  readonly status: SpecificationStatus;
  readonly handoffId: string | undefined;
  readonly updatedAt: string;
}

export interface SddState {
  readonly version: 1;
  readonly specs: Record<string, SpecRecord>;
}

const STATE_VERSION = 1;

export function emptyState(): SddState {
  return { version: STATE_VERSION, specs: {} };
}

export function statePathFor(projectRoot: string): string {
  return path.join(projectRoot, '.claude', 'sdd-state.json');
}

export async function loadState(projectRoot: string): Promise<SddState> {
  const filePath = statePathFor(projectRoot);
  const raw = await readFileIfExists(filePath);
  if (raw === undefined) return emptyState();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw actionable(
      'STATE_MALFORMED',
      `${filePath} is not valid JSON. Fix or delete it (it is local, disposable state) and retry.`,
    );
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('specs' in parsed) ||
    typeof (parsed as { specs: unknown }).specs !== 'object'
  ) {
    throw actionable(
      'STATE_MALFORMED',
      `${filePath} does not match the expected SDD state schema. Fix or delete it and retry.`,
    );
  }

  const specs = (parsed as { specs: Record<string, SpecRecord> }).specs;
  return { version: STATE_VERSION, specs: specs ?? {} };
}

export async function saveState(projectRoot: string, state: SddState): Promise<void> {
  const filePath = statePathFor(projectRoot);
  await writeFileEnsuringDir(filePath, JSON.stringify(state, null, 2) + '\n');
}

export function recordKey(providerId: string, specId: string): string {
  return `${providerId}:${specId}`;
}

export async function stateFileExists(projectRoot: string): Promise<boolean> {
  return pathExists(statePathFor(projectRoot));
}
