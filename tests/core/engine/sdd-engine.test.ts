import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { SddEngine } from '../../../src/core/engine/sdd-engine.js';
import { genericProvider } from '../../../src/providers/generic/generic-provider.js';
import { kiroProvider } from '../../../src/providers/kiro/kiro-provider.js';
import { mergeConfig } from '../../../src/core/models/config.js';
import { writeFileEnsuringDir } from '../../../src/utils/fs.js';
import { withTempDir } from '../../helpers/tmp.js';

function makeEngine(): SddEngine {
  const engine = new SddEngine();
  engine.registerProvider(kiroProvider);
  engine.registerProvider(genericProvider);
  return engine;
}

describe('SddEngine', () => {
  it('auto-resolves to Kiro when .kiro/specs exists, generic otherwise', async () => {
    const engine = makeEngine();
    const config = mergeConfig(undefined);

    await withTempDir(async (dir) => {
      const generic = await engine.resolveProvider({ projectRoot: dir }, config);
      expect(generic.id).toBe('generic');
    });

    await withTempDir(async (dir) => {
      await writeFileEnsuringDir(path.join(dir, '.kiro', 'specs', 'x', 'tasks.md'), '## Tasks\n- [ ] 1. A\n');
      const kiro = await engine.resolveProvider({ projectRoot: dir }, config);
      expect(kiro.id).toBe('kiro');
    });
  });

  it('honors an explicit provider override in config', async () => {
    const engine = makeEngine();
    await withTempDir(async (dir) => {
      const provider = await engine.resolveProvider({ projectRoot: dir }, mergeConfig({ provider: 'generic' }));
      expect(provider.id).toBe('generic');
    });
  });

  it('throws an actionable error for an unknown provider', async () => {
    const engine = makeEngine();
    await withTempDir(async (dir) => {
      // @ts-expect-error deliberately invalid for the test
      await expect(engine.resolveProvider({ projectRoot: dir }, mergeConfig({ provider: 'nope' }))).rejects.toThrow(
        /Unknown SDD provider/,
      );
    });
  });

  it('creates exactly one handoff the first time a spec is observed complete, and none after', async () => {
    const engine = makeEngine();
    const config = mergeConfig(undefined);

    await withTempDir(async (dir) => {
      await engine.create({ projectRoot: dir }, config, {
        id: 'done-spec',
        title: 'Done Spec',
        tasksBody: '- [x] 1. A\n- [x] 2. B\n',
      });

      const first = await engine.sync({ projectRoot: dir }, config);
      expect(first.handoffsCreated).toHaveLength(1);
      expect(first.specs[0]!.status).toBe('handoff_pending');

      const second = await engine.sync({ projectRoot: dir }, config);
      expect(second.handoffsCreated).toHaveLength(0);
      expect(second.specs[0]!.status).toBe('handoff_pending');
      expect(second.specs[0]!.handoffId).toBe(first.specs[0]!.handoffId);
    });
  });

  it('a completed/handoff-pending spec is not reported as active', async () => {
    const engine = makeEngine();
    const config = mergeConfig(undefined);

    await withTempDir(async (dir) => {
      await engine.create({ projectRoot: dir }, config, {
        id: 'done-spec',
        title: 'Done Spec',
        tasksBody: '- [x] 1. A\n',
      });
      const result = await engine.sync({ projectRoot: dir }, config);
      expect(result.active).toBeUndefined();
    });
  });

  it('reports an in-progress spec as active', async () => {
    const engine = makeEngine();
    const config = mergeConfig(undefined);

    await withTempDir(async (dir) => {
      await engine.create({ projectRoot: dir }, config, {
        id: 'wip',
        title: 'WIP',
        tasksBody: '- [x] 1. A\n- [ ] 2. B\n',
      });
      const result = await engine.sync({ projectRoot: dir }, config);
      expect(result.active?.summary.identity.id).toBe('wip');
      expect(result.active?.status).toBe('in_progress');
    });
  });

  it('acknowledgeHandoff moves a spec to handoff_completed and is idempotent to re-sync', async () => {
    const engine = makeEngine();
    const config = mergeConfig(undefined);

    await withTempDir(async (dir) => {
      await engine.create({ projectRoot: dir }, config, {
        id: 'done-spec',
        title: 'Done Spec',
        tasksBody: '- [x] 1. A\n',
      });
      await engine.sync({ projectRoot: dir }, config);
      await engine.acknowledgeHandoff({ projectRoot: dir }, config, 'done-spec');

      const result = await engine.sync({ projectRoot: dir }, config);
      expect(result.specs[0]!.status).toBe('handoff_completed');
      expect(result.handoffsCreated).toHaveLength(0);
    });
  });

  it('refuses to acknowledge a handoff for a spec with no pending handoff', async () => {
    const engine = makeEngine();
    const config = mergeConfig(undefined);
    await withTempDir(async (dir) => {
      await engine.create({ projectRoot: dir }, config, { id: 'wip', title: 'WIP' });
      await engine.sync({ projectRoot: dir }, config);
      await expect(engine.acknowledgeHandoff({ projectRoot: dir }, config, 'wip')).rejects.toThrow(
        /no pending handoff/,
      );
    });
  });

  it('resumes tracking normally if a completed spec regresses (a top-level task is unchecked again)', async () => {
    const engine = makeEngine();
    const config = mergeConfig(undefined);

    await withTempDir(async (dir) => {
      await engine.create({ projectRoot: dir }, config, {
        id: 'flippy',
        title: 'Flippy',
        tasksBody: '- [x] 1. A\n',
      });
      await engine.sync({ projectRoot: dir }, config);

      await writeFileEnsuringDir(
        path.join(dir, '.sdd', 'specs', 'flippy', 'tasks.md'),
        '# Flippy — Tasks\n\n## Tasks\n\n- [ ] 1. A\n',
      );

      const result = await engine.sync({ projectRoot: dir }, config);
      expect(result.specs[0]!.status).toBe('approved');
      expect(result.specs[0]!.handoffId).toBeUndefined();
    });
  });

  it('disables handoff creation when handoffNotifications is false', async () => {
    const engine = makeEngine();
    const config = mergeConfig({ handoffNotifications: false });

    await withTempDir(async (dir) => {
      await engine.create({ projectRoot: dir }, config, {
        id: 'done-spec',
        title: 'Done Spec',
        tasksBody: '- [x] 1. A\n',
      });
      const result = await engine.sync({ projectRoot: dir }, config);
      expect(result.handoffsCreated).toHaveLength(0);
      expect(result.specs[0]!.status).toBe('handoff_pending');
    });
  });
});
