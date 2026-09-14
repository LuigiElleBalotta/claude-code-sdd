import { describe, expect, it } from 'vitest';
import { deriveBaseStatus } from '../../../src/core/lifecycle/derive-status.js';
import { parseTaskList } from '../../../src/core/tasks/parse-task-list.js';

describe('deriveBaseStatus', () => {
  it('is draft when there is no tasks section', () => {
    const tasks = parseTaskList('no tasks here');
    expect(deriveBaseStatus({ hasRequirements: true, hasDesign: true, tasks })).toBe('draft');
  });

  it('is draft when the tasks section is empty', () => {
    const tasks = parseTaskList('## Tasks\n');
    expect(deriveBaseStatus({ hasRequirements: true, hasDesign: true, tasks })).toBe('draft');
  });

  it('is approved when tasks exist but none are started', () => {
    const tasks = parseTaskList('## Tasks\n- [ ] 1. A\n- [ ] 2. B\n');
    expect(deriveBaseStatus({ hasRequirements: true, hasDesign: true, tasks })).toBe('approved');
  });

  it('is in_progress when some but not all top-level tasks are done', () => {
    const tasks = parseTaskList('## Tasks\n- [x] 1. A\n- [ ] 2. B\n');
    expect(deriveBaseStatus({ hasRequirements: true, hasDesign: true, tasks })).toBe('in_progress');
  });

  it('is completed when all top-level tasks are done regardless of subtasks', () => {
    const tasks = parseTaskList('## Tasks\n- [x] 1. A\n  - [ ] 1.1 sub\n- [x] 2. B\n');
    expect(deriveBaseStatus({ hasRequirements: true, hasDesign: true, tasks })).toBe('completed');
  });
});
