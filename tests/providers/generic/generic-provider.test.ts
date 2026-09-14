import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { genericProvider } from '../../../src/providers/generic/generic-provider.js';
import { writeFileEnsuringDir } from '../../../src/utils/fs.js';
import { withTempDir } from '../../helpers/tmp.js';

describe('genericProvider', () => {
  it('reports not applicable when .sdd/specs does not exist', async () => {
    await withTempDir(async (dir) => {
      expect(await genericProvider.isApplicable({ projectRoot: dir })).toBe(false);
    });
  });

  it('creates a specification with scaffolded requirements/design/tasks', async () => {
    await withTempDir(async (dir) => {
      const spec = await genericProvider.create({ projectRoot: dir }, { id: 'my-feature', title: 'My Feature' });
      expect(spec.identity).toEqual({ id: 'my-feature', provider: 'generic' });
      expect(spec.status).toBe('approved');
      expect(spec.title).toBe('My Feature');
      expect(await genericProvider.isApplicable({ projectRoot: dir })).toBe(true);
    });
  });

  it('refuses to create a duplicate specification', async () => {
    await withTempDir(async (dir) => {
      await genericProvider.create({ projectRoot: dir }, { id: 'dup', title: 'Dup' });
      await expect(genericProvider.create({ projectRoot: dir }, { id: 'dup', title: 'Dup 2' })).rejects.toThrow(
        /already exists/,
      );
    });
  });

  it('discovers multiple specifications and reflects their task progress', async () => {
    await withTempDir(async (dir) => {
      await genericProvider.create({ projectRoot: dir }, { id: 'alpha', title: 'Alpha' });
      await genericProvider.create(
        { projectRoot: dir },
        { id: 'beta', title: 'Beta', tasksBody: '- [x] 1. Done\n- [x] 2. Also done\n' },
      );

      const summaries = await genericProvider.discover({ projectRoot: dir });
      expect(summaries.map((s) => s.identity.id).sort()).toEqual(['alpha', 'beta']);

      const beta = summaries.find((s) => s.identity.id === 'beta')!;
      expect(beta.status).toBe('completed');
      expect(beta.completedTopLevelTasks).toBe(2);
      expect(beta.totalTopLevelTasks).toBe(2);

      const alpha = summaries.find((s) => s.identity.id === 'alpha')!;
      expect(alpha.status).toBe('approved');
    });
  });

  it('returns undefined for a nonexistent specification', async () => {
    await withTempDir(async (dir) => {
      expect(await genericProvider.read({ projectRoot: dir }, 'ghost')).toBeUndefined();
    });
  });

  it('derives the title from the requirements heading when present', async () => {
    await withTempDir(async (dir) => {
      await writeFileEnsuringDir(
        path.join(dir, '.sdd', 'specs', 'x', 'requirements.md'),
        '# Custom Title\n\nSome requirements.\n',
      );
      await writeFileEnsuringDir(path.join(dir, '.sdd', 'specs', 'x', 'tasks.md'), '## Tasks\n- [ ] 1. A\n');
      const spec = await genericProvider.read({ projectRoot: dir }, 'x');
      expect(spec?.title).toBe('Custom Title');
    });
  });

  it('surfaces malformed task input as warnings without throwing', async () => {
    await withTempDir(async (dir) => {
      await writeFileEnsuringDir(
        path.join(dir, '.sdd', 'specs', 'broken', 'tasks.md'),
        '## Tasks\n- [x] 1. Fine\n- [?] 2. broken\n',
      );
      const spec = await genericProvider.read({ projectRoot: dir }, 'broken');
      expect(spec?.tasks.warnings.length).toBeGreaterThan(0);
    });
  });
});
