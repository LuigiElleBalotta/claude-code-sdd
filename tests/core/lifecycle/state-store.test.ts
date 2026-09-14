import { describe, expect, it } from 'vitest';
import { loadState, saveState, statePathFor } from '../../../src/core/lifecycle/state-store.js';
import { writeFileEnsuringDir } from '../../../src/utils/fs.js';
import { withTempDir } from '../../helpers/tmp.js';

describe('state store', () => {
  it('returns empty state when no state file exists', async () => {
    await withTempDir(async (dir) => {
      const state = await loadState(dir);
      expect(state).toEqual({ version: 1, specs: {} });
    });
  });

  it('round-trips a saved state', async () => {
    await withTempDir(async (dir) => {
      await saveState(dir, {
        version: 1,
        specs: { 'generic:x': { status: 'in_progress', handoffId: undefined, updatedAt: '2026-01-01T00:00:00.000Z' } },
      });
      const state = await loadState(dir);
      expect(state.specs['generic:x']?.status).toBe('in_progress');
    });
  });

  it('throws an actionable error for malformed JSON', async () => {
    await withTempDir(async (dir) => {
      await writeFileEnsuringDir(statePathFor(dir), '{ not json');
      await expect(loadState(dir)).rejects.toThrow(/not valid JSON/);
    });
  });

  it('throws an actionable error for JSON that does not match the schema', async () => {
    await withTempDir(async (dir) => {
      await writeFileEnsuringDir(statePathFor(dir), JSON.stringify({ foo: 'bar' }));
      await expect(loadState(dir)).rejects.toThrow(/expected SDD state schema/);
    });
  });
});
