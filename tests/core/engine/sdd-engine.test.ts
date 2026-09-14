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

  describe('default lifecycle (autoContextBoundary: true)', () => {
    it('creates exactly one handoff and requests a context boundary the first time a spec completes', async () => {
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
        expect(first.specs[0]!.status).toBe('context_boundary');
        expect(first.specs[0]!.handoff?.id).toBe(first.handoffsCreated[0]!.id);

        const second = await engine.sync({ projectRoot: dir }, config);
        expect(second.handoffsCreated).toHaveLength(0);
        expect(second.specs[0]!.status).toBe('context_boundary');
        expect(second.specs[0]!.handoff?.id).toBe(first.specs[0]!.handoff?.id);
      });
    });

    it('a completed/context_boundary spec is not reported as active', async () => {
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

    it('restoreContextBoundaries consumes a pending boundary exactly once (handoff_restored is terminal)', async () => {
      const engine = makeEngine();
      const config = mergeConfig(undefined);

      await withTempDir(async (dir) => {
        await engine.create({ projectRoot: dir }, config, {
          id: 'done-spec',
          title: 'Done Spec',
          tasksBody: '- [x] 1. A\n',
        });
        await engine.sync({ projectRoot: dir }, config);

        const restored = await engine.restoreContextBoundaries({ projectRoot: dir });
        expect(restored).toHaveLength(1);
        expect(restored[0]!.identity.id).toBe('done-spec');
        expect(restored[0]!.handoff?.summary).toMatch(/Done Spec/);

        // Calling it again immediately restores nothing new — already terminal.
        const restoredAgain = await engine.restoreContextBoundaries({ projectRoot: dir });
        expect(restoredAgain).toHaveLength(0);
      });
    });

    it('CRITICAL: after restoration, further sync() calls never re-enter context_boundary', async () => {
      const engine = makeEngine();
      const config = mergeConfig(undefined);

      await withTempDir(async (dir) => {
        await engine.create({ projectRoot: dir }, config, {
          id: 'done-spec',
          title: 'Done Spec',
          tasksBody: '- [x] 1. A\n',
        });
        await engine.sync({ projectRoot: dir }, config);
        await engine.restoreContextBoundaries({ projectRoot: dir });

        // Simulate many subsequent Stop hooks in the fresh session (or a
        // launcher that never even ran) — none of them may resurrect a
        // context boundary for a specification that has already been
        // restored. This is the loop that would otherwise restart forever.
        for (let i = 0; i < 5; i++) {
          const result = await engine.sync({ projectRoot: dir }, config);
          expect(result.specs[0]!.status).toBe('handoff_restored');
          expect(result.handoffsCreated).toHaveLength(0);
        }
      });
    });

    it('a record left at context_boundary with no launcher ever running still restores on a later manual session start', async () => {
      const engine = makeEngine();
      const config = mergeConfig(undefined);

      await withTempDir(async (dir) => {
        await engine.create({ projectRoot: dir }, config, {
          id: 'done-spec',
          title: 'Done Spec',
          tasksBody: '- [x] 1. A\n',
        });
        await engine.sync({ projectRoot: dir }, config);

        // Time passes; several unrelated syncs happen (e.g. `claude-sdd
        // status` run manually) with nothing consuming the boundary.
        await engine.sync({ projectRoot: dir }, config);
        await engine.sync({ projectRoot: dir }, config);

        // Eventually a fresh session starts (this call is exactly what its
        // SessionStart hook performs) and restores it — graceful degradation
        // without a launcher ever having run.
        const restored = await engine.restoreContextBoundaries({ projectRoot: dir });
        expect(restored).toHaveLength(1);
        expect(restored[0]!.handoff).toBeDefined();
      });
    });

    it('multiple specifications are independent: one restored does not affect another that completes later', async () => {
      const engine = makeEngine();
      const config = mergeConfig(undefined);

      await withTempDir(async (dir) => {
        await engine.create({ projectRoot: dir }, config, {
          id: 'first',
          title: 'First',
          tasksBody: '- [x] 1. A\n',
        });
        await engine.sync({ projectRoot: dir }, config);
        const restored = await engine.restoreContextBoundaries({ projectRoot: dir });
        expect(restored).toHaveLength(1);

        // A second, unrelated specification is created and completed later.
        await engine.create({ projectRoot: dir }, config, {
          id: 'second',
          title: 'Second',
          tasksBody: '- [ ] 1. A\n',
        });
        let result = await engine.sync({ projectRoot: dir }, config);
        const byId = (id: string) => result.specs.find((s) => s.summary.identity.id === id)!;
        expect(byId('first').status).toBe('handoff_restored');
        expect(byId('second').status).toBe('approved');

        await writeFileEnsuringDir(
          path.join(dir, '.sdd', 'specs', 'second', 'tasks.md'),
          '# Second — Tasks\n\n## Tasks\n\n- [x] 1. A\n',
        );
        result = await engine.sync({ projectRoot: dir }, config);
        expect(byId('first').status).toBe('handoff_restored'); // unaffected
        expect(byId('second').status).toBe('context_boundary'); // independently triggers its own boundary

        const restoredSecond = await engine.restoreContextBoundaries({ projectRoot: dir });
        expect(restoredSecond).toHaveLength(1);
        expect(restoredSecond[0]!.identity.id).toBe('second');
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
        expect(result.specs[0]!.handoff).toBeUndefined();
      });
    });

    it('a regression after restoration also resets handoff_restored back to normal tracking', async () => {
      const engine = makeEngine();
      const config = mergeConfig(undefined);

      await withTempDir(async (dir) => {
        await engine.create({ projectRoot: dir }, config, {
          id: 'flippy',
          title: 'Flippy',
          tasksBody: '- [x] 1. A\n',
        });
        await engine.sync({ projectRoot: dir }, config);
        await engine.restoreContextBoundaries({ projectRoot: dir });

        await writeFileEnsuringDir(
          path.join(dir, '.sdd', 'specs', 'flippy', 'tasks.md'),
          '# Flippy — Tasks\n\n## Tasks\n\n- [ ] 1. A\n',
        );

        const result = await engine.sync({ projectRoot: dir }, config);
        expect(result.specs[0]!.status).toBe('approved');
        expect(result.specs[0]!.handoff).toBeUndefined();
      });
    });
  });

  describe('legacy manual mode (autoContextBoundary: false)', () => {
    it('stops at handoff_pending instead of requesting a context boundary', async () => {
      const engine = makeEngine();
      const config = mergeConfig({ autoContextBoundary: false });

      await withTempDir(async (dir) => {
        await engine.create({ projectRoot: dir }, config, {
          id: 'done-spec',
          title: 'Done Spec',
          tasksBody: '- [x] 1. A\n',
        });
        const result = await engine.sync({ projectRoot: dir }, config);
        expect(result.specs[0]!.status).toBe('handoff_pending');
      });
    });

    it('acknowledgeHandoff moves a spec to handoff_completed and is idempotent to re-sync', async () => {
      const engine = makeEngine();
      const config = mergeConfig({ autoContextBoundary: false });

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
      const config = mergeConfig({ autoContextBoundary: false });
      await withTempDir(async (dir) => {
        await engine.create({ projectRoot: dir }, config, { id: 'wip', title: 'WIP' });
        await engine.sync({ projectRoot: dir }, config);
        await expect(engine.acknowledgeHandoff({ projectRoot: dir }, config, 'wip')).rejects.toThrow(
          /no pending handoff/,
        );
      });
    });

    it('refuses to acknowledge a context_boundary specification (that path restores automatically instead)', async () => {
      const engine = makeEngine();
      const config = mergeConfig({ autoContextBoundary: true });
      await withTempDir(async (dir) => {
        await engine.create({ projectRoot: dir }, config, {
          id: 'done-spec',
          title: 'Done Spec',
          tasksBody: '- [x] 1. A\n',
        });
        await engine.sync({ projectRoot: dir }, config);
        await expect(engine.acknowledgeHandoff({ projectRoot: dir }, config, 'done-spec')).rejects.toThrow(
          /no pending handoff/,
        );
      });
    });
  });

  it('disables any lifecycle overlay when handoffNotifications is false (pure opt-out)', async () => {
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
      expect(result.specs[0]!.status).toBe('completed');
      expect(result.specs[0]!.handoff).toBeUndefined();
    });
  });
});
