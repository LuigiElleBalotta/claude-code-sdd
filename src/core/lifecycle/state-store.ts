import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import type { SpecificationStatus } from '../models/specification.js';
import type { Handoff } from '../models/handoff.js';
import { pathExists, readFileIfExists } from '../../utils/fs.js';
import { actionable } from '../../utils/errors.js';

export interface SpecRecord {
  readonly status: SpecificationStatus;
  /**
   * The full handoff produced when this specification completed, persisted
   * (not just its id) so a later process — a fresh session's SessionStart
   * hook, or a launcher — can present it without having witnessed the
   * `sync()` call that created it. Absent for specifications that never
   * completed, or whose state predates this field (tolerated, not migrated).
   */
  readonly handoff: Handoff | undefined;
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
    typeof (parsed as { specs: unknown }).specs !== 'object' ||
    (parsed as { specs: unknown }).specs === null
  ) {
    throw actionable(
      'STATE_MALFORMED',
      `${filePath} does not match the expected SDD state schema. Fix or delete it and retry.`,
    );
  }

  // Intentionally lenient per-record: a record missing `handoff` (an older
  // state shape, or one written by a future version) is valid — it just
  // means "no persisted handoff", not a schema violation. This keeps the
  // state file forward/backward tolerant without a migration step.
  const specs = (parsed as { specs: Record<string, SpecRecord> }).specs;
  return { version: STATE_VERSION, specs: specs ?? {} };
}

/**
 * Writes the state file atomically: a torn/partial write must never be
 * observable by a concurrent reader (a launcher watching `.claude/` for
 * changes, in particular). Writes to a sibling temp file and renames it into
 * place — `rename` within the same directory is atomic on Windows, macOS,
 * and Linux.
 */
export async function saveState(projectRoot: string, state: SddState): Promise<void> {
  const filePath = statePathFor(projectRoot);
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = path.join(path.dirname(filePath), `.sdd-state.${randomUUID()}.tmp`);
  await writeFile(tempPath, JSON.stringify(state, null, 2) + '\n', 'utf8');
  await rename(tempPath, filePath);
}

export function recordKey(providerId: string, specId: string): string {
  return `${providerId}:${specId}`;
}

export async function stateFileExists(projectRoot: string): Promise<boolean> {
  return pathExists(statePathFor(projectRoot));
}
