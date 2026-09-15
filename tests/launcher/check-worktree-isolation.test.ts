import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { worktreeIsolationWarning } from '../../src/launcher/check-worktree-isolation.js';
import { writeFileEnsuringDir } from '../../src/utils/fs.js';
import { withTempDir } from '../helpers/tmp.js';

describe('worktreeIsolationWarning', () => {
  it('warns when no .claude/settings.json exists', async () => {
    await withTempDir(async (dir) => {
      const warning = await worktreeIsolationWarning(dir);
      expect(warning).toMatch(/bgIsolation/);
    });
  });

  it('warns when settings.json is malformed', async () => {
    await withTempDir(async (dir) => {
      await writeFileEnsuringDir(path.join(dir, '.claude', 'settings.json'), '{ bad');
      const warning = await worktreeIsolationWarning(dir);
      expect(warning).toMatch(/bgIsolation/);
    });
  });

  it('warns when worktree.bgIsolation is unset', async () => {
    await withTempDir(async (dir) => {
      await writeFileEnsuringDir(path.join(dir, '.claude', 'settings.json'), JSON.stringify({}));
      const warning = await worktreeIsolationWarning(dir);
      expect(warning).toMatch(/bgIsolation/);
    });
  });

  it('warns when worktree.bgIsolation is set to something other than "none"', async () => {
    await withTempDir(async (dir) => {
      await writeFileEnsuringDir(
        path.join(dir, '.claude', 'settings.json'),
        JSON.stringify({ worktree: { bgIsolation: 'default' } }),
      );
      const warning = await worktreeIsolationWarning(dir);
      expect(warning).toMatch(/bgIsolation/);
    });
  });

  it('returns no warning when worktree.bgIsolation is "none"', async () => {
    await withTempDir(async (dir) => {
      await writeFileEnsuringDir(
        path.join(dir, '.claude', 'settings.json'),
        JSON.stringify({ worktree: { bgIsolation: 'none' } }),
      );
      const warning = await worktreeIsolationWarning(dir);
      expect(warning).toBeUndefined();
    });
  });

  it('prefers settings.local.json over settings.json', async () => {
    await withTempDir(async (dir) => {
      await writeFileEnsuringDir(
        path.join(dir, '.claude', 'settings.json'),
        JSON.stringify({ worktree: { bgIsolation: 'default' } }),
      );
      await writeFileEnsuringDir(
        path.join(dir, '.claude', 'settings.local.json'),
        JSON.stringify({ worktree: { bgIsolation: 'none' } }),
      );
      const warning = await worktreeIsolationWarning(dir);
      expect(warning).toBeUndefined();
    });
  });

  it('falls through to settings.json when settings.local.json exists but is silent on bgIsolation', async () => {
    await withTempDir(async (dir) => {
      await writeFileEnsuringDir(path.join(dir, '.claude', 'settings.local.json'), JSON.stringify({}));
      await writeFileEnsuringDir(
        path.join(dir, '.claude', 'settings.json'),
        JSON.stringify({ worktree: { bgIsolation: 'none' } }),
      );
      const warning = await worktreeIsolationWarning(dir);
      expect(warning).toBeUndefined();
    });
  });

  it('falls back to the user-level settings.json (default ~/.claude)', async () => {
    await withTempDir(async (dir) => {
      await withTempDir(async (userConfigDir) => {
        await writeFileEnsuringDir(
          path.join(userConfigDir, 'settings.json'),
          JSON.stringify({ worktree: { bgIsolation: 'none' } }),
        );
        const warning = await worktreeIsolationWarning(dir, userConfigDir);
        expect(warning).toBeUndefined();
      });
    });
  });

  it('warns even with a user-level settings.json when it does not set bgIsolation', async () => {
    await withTempDir(async (dir) => {
      await withTempDir(async (userConfigDir) => {
        await writeFileEnsuringDir(path.join(userConfigDir, 'settings.json'), JSON.stringify({}));
        const warning = await worktreeIsolationWarning(dir, userConfigDir);
        expect(warning).toMatch(/bgIsolation/);
      });
    });
  });

  it('respects CLAUDE_CONFIG_DIR: reads settings.json directly under it, no .claude subfolder', async () => {
    await withTempDir(async (dir) => {
      await withTempDir(async (claudeWorkDir) => {
        const original = process.env.CLAUDE_CONFIG_DIR;
        process.env.CLAUDE_CONFIG_DIR = claudeWorkDir;
        try {
          await writeFileEnsuringDir(
            path.join(claudeWorkDir, 'settings.json'),
            JSON.stringify({ worktree: { bgIsolation: 'none' } }),
          );
          const warning = await worktreeIsolationWarning(dir);
          expect(warning).toBeUndefined();
        } finally {
          if (original === undefined) delete process.env.CLAUDE_CONFIG_DIR;
          else process.env.CLAUDE_CONFIG_DIR = original;
        }
      });
    });
  });
});
