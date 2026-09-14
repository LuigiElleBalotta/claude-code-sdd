import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { loadConfig } from '../../src/config/load-config.js';
import { writeFileEnsuringDir } from '../../src/utils/fs.js';
import { withTempDir } from '../helpers/tmp.js';

describe('loadConfig', () => {
  it('returns defaults when no config file exists', async () => {
    await withTempDir(async (dir) => {
      const config = await loadConfig(dir);
      expect(config).toEqual({ provider: 'auto', handoffNotifications: true });
    });
  });

  it('merges a partial config over the defaults', async () => {
    await withTempDir(async (dir) => {
      await writeFileEnsuringDir(path.join(dir, '.sdd', 'config.json'), JSON.stringify({ provider: 'kiro' }));
      const config = await loadConfig(dir);
      expect(config).toEqual({ provider: 'kiro', handoffNotifications: true });
    });
  });

  it('rejects an invalid provider value', async () => {
    await withTempDir(async (dir) => {
      await writeFileEnsuringDir(path.join(dir, '.sdd', 'config.json'), JSON.stringify({ provider: 'bogus' }));
      await expect(loadConfig(dir)).rejects.toThrow(/must be one of/);
    });
  });

  it('rejects malformed JSON', async () => {
    await withTempDir(async (dir) => {
      await writeFileEnsuringDir(path.join(dir, '.sdd', 'config.json'), '{ bad');
      await expect(loadConfig(dir)).rejects.toThrow(/not valid JSON/);
    });
  });
});
