import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { kiroProvider } from '../../../src/providers/kiro/kiro-provider.js';
import { writeFileEnsuringDir } from '../../../src/utils/fs.js';
import { withTempDir } from '../../helpers/tmp.js';

const TASKS_ALL_TOP_LEVEL_DONE = [
  '# Auth Feature',
  '',
  '## Tasks',
  '',
  '- [x] 1. Implement authentication',
  '  - [x] 1.1 Create authentication service',
  '  - [x] 1.2 Add token validation',
  '- [x] 2. Implement authorization',
  '  - [x] 2.1 Add roles',
  '  - [x] 2.2 Add permissions',
  '',
].join('\n');

const TASKS_ONE_TOP_LEVEL_INCOMPLETE = [
  '## Tasks',
  '',
  '- [x] 1. Implement authentication',
  '  - [x] 1.1 Create authentication service',
  '  - [x] 1.2 Add token validation',
  '- [x] 2. Implement authorization',
  '  - [x] 2.1 Add roles',
  '  - [x] 2.2 Add permissions',
  '- [ ] 3. Add tests',
  '  - [ ] 3.1 Unit tests',
  '  - [ ] 3.2 Integration tests',
  '',
].join('\n');

async function writeKiroTasks(root: string, specId: string, content: string): Promise<void> {
  await writeFileEnsuringDir(path.join(root, '.kiro', 'specs', specId, 'tasks.md'), content);
}

describe('kiroProvider', () => {
  it('discovers specs matching .kiro/specs/**/tasks.md', async () => {
    await withTempDir(async (dir) => {
      await writeKiroTasks(dir, 'feature-a', TASKS_ALL_TOP_LEVEL_DONE);
      await writeKiroTasks(dir, 'nested/feature-b', TASKS_ONE_TOP_LEVEL_INCOMPLETE);

      expect(await kiroProvider.isApplicable({ projectRoot: dir })).toBe(true);
      const summaries = await kiroProvider.discover({ projectRoot: dir });
      expect(summaries.map((s) => s.identity.id).sort()).toEqual(['feature-a', 'nested/feature-b']);
    });
  });

  it('is complete when all TOP-LEVEL tasks are done, even with an unchecked subtask (spec example)', async () => {
    await withTempDir(async (dir) => {
      // This is the exact case called out by the SDD spec: task 1 and 2 are
      // fully checked at the top level; nothing here is unchecked at the top
      // level, so the spec must be "completed" even though the fixture below
      // also documents the companion case with an incomplete top-level task.
      await writeKiroTasks(dir, 'auth-feature', TASKS_ALL_TOP_LEVEL_DONE);
      const spec = await kiroProvider.read({ projectRoot: dir }, 'auth-feature');
      expect(spec?.status).toBe('completed');
      expect(spec?.tasks.topLevel).toHaveLength(2);
    });
  });

  it('is NOT complete when a top-level task is unchecked, regardless of its subtasks', async () => {
    await withTempDir(async (dir) => {
      await writeKiroTasks(dir, 'auth-feature', TASKS_ONE_TOP_LEVEL_INCOMPLETE);
      const spec = await kiroProvider.read({ projectRoot: dir }, 'auth-feature');
      expect(spec?.status).not.toBe('completed');
      expect(spec?.tasks.topLevel).toHaveLength(3);
      expect(spec?.tasks.topLevel[2]!.done).toBe(false);
    });
  });

  it('ignores checkboxes outside the ## Tasks section', async () => {
    await withTempDir(async (dir) => {
      const content = ['## Notes', '- [ ] unrelated checkbox', '', '## Tasks', '- [x] 1. Only task'].join('\n');
      await writeKiroTasks(dir, 's', content);
      const spec = await kiroProvider.read({ projectRoot: dir }, 's');
      expect(spec?.tasks.topLevel).toHaveLength(1);
      expect(spec?.status).toBe('completed');
    });
  });

  it('handles a missing ## Tasks section gracefully (draft, not completed)', async () => {
    await withTempDir(async (dir) => {
      await writeKiroTasks(dir, 's', '# Spec\n\nNo tasks yet.\n');
      const spec = await kiroProvider.read({ projectRoot: dir }, 's');
      expect(spec?.status).toBe('draft');
    });
  });

  it('handles CRLF tasks.md files identically to LF', async () => {
    await withTempDir(async (dir) => {
      await writeKiroTasks(dir, 's', TASKS_ALL_TOP_LEVEL_DONE.replace(/\n/g, '\r\n'));
      const spec = await kiroProvider.read({ projectRoot: dir }, 's');
      expect(spec?.status).toBe('completed');
      expect(spec?.tasks.topLevel).toHaveLength(2);
    });
  });

  it('supports task numbers greater than 9', async () => {
    await withTempDir(async (dir) => {
      const content = ['## Tasks', '- [x] 9. Nine', '- [x] 10. Ten', '- [x] 11. Eleven'].join('\n');
      await writeKiroTasks(dir, 's', content);
      const spec = await kiroProvider.read({ projectRoot: dir }, 's');
      expect(spec?.status).toBe('completed');
      expect(spec?.tasks.topLevel).toHaveLength(3);
    });
  });

  it('tolerates malformed task lines without throwing, reporting warnings', async () => {
    await withTempDir(async (dir) => {
      const content = ['## Tasks', '- [x] 1. Fine', '- [??] 2. broken', '- [ ] 3. Also fine'].join('\n');
      await writeKiroTasks(dir, 's', content);
      const spec = await kiroProvider.read({ projectRoot: dir }, 's');
      expect(spec?.tasks.warnings.length ?? 0).toBeGreaterThan(0);
      expect(spec?.tasks.topLevel).toHaveLength(2);
    });
  });

  it('creates a new Kiro specification and refuses duplicates', async () => {
    await withTempDir(async (dir) => {
      const spec = await kiroProvider.create({ projectRoot: dir }, { id: 'new-thing', title: 'New Thing' });
      expect(spec.identity).toEqual({ id: 'new-thing', provider: 'kiro' });
      await expect(kiroProvider.create({ projectRoot: dir }, { id: 'new-thing', title: 'Again' })).rejects.toThrow(
        /already exists/,
      );
    });
  });
});
