import { describe, expect, it } from 'vitest';
import { parseTaskList } from '../../../src/core/tasks/parse-task-list.js';
import { isTaskListComplete, countAllTasks } from '../../../src/core/models/task.js';

describe('parseTaskList', () => {
  it('treats a Kiro-style spec as complete when only top-level tasks are checked', () => {
    const md = `# Spec\n\n## Tasks\n\n- [x] 1. Implement authentication\n  - [x] 1.1 Create authentication service\n  - [x] 1.2 Add token validation\n- [x] 2. Implement authorization\n  - [x] 2.1 Add roles\n  - [x] 2.2 Add permissions\n- [ ] 3. Add tests\n  - [ ] 3.1 Unit tests\n  - [ ] 3.2 Integration tests\n`;
    const result = parseTaskList(md);
    expect(result.sectionFound).toBe(true);
    expect(result.topLevel).toHaveLength(3);
    expect(isTaskListComplete(result.topLevel)).toBe(false); // task 3 is unchecked
  });

  it('is complete when all top-level tasks are checked, even if a subtask is unchecked', () => {
    const md = [
      '## Tasks',
      '',
      '- [x] 1. Feature',
      '  - [ ] 1.1 Subtask',
      '',
      '- [x] 2. Another feature',
    ].join('\n');
    const result = parseTaskList(md);
    expect(result.topLevel).toHaveLength(2);
    expect(isTaskListComplete(result.topLevel)).toBe(true);
    expect(result.topLevel[0]!.children).toHaveLength(1);
    expect(result.topLevel[0]!.children[0]!.done).toBe(false);
  });

  it('ignores checkboxes outside the Tasks section', () => {
    const md = [
      '## Notes',
      '- [ ] not a real task, just a note',
      '',
      '## Tasks',
      '- [x] 1. Real task',
    ].join('\n');
    const result = parseTaskList(md);
    expect(result.topLevel).toHaveLength(1);
    expect(result.topLevel[0]!.title).toBe('Real task');
  });

  it('stops the Tasks section at the next heading of equal or higher level', () => {
    const md = ['## Tasks', '- [x] 1. A', '## Appendix', '- [ ] not a task'].join('\n');
    const result = parseTaskList(md);
    expect(result.topLevel).toHaveLength(1);
  });

  it('handles missing Tasks section gracefully', () => {
    const result = parseTaskList('# Spec\n\nNo tasks here.\n');
    expect(result.sectionFound).toBe(false);
    expect(result.topLevel).toHaveLength(0);
    expect(isTaskListComplete(result.topLevel)).toBe(false);
  });

  it('handles an empty Tasks section gracefully', () => {
    const result = parseTaskList('## Tasks\n\nComing soon.\n');
    expect(result.sectionFound).toBe(true);
    expect(result.topLevel).toHaveLength(0);
    expect(isTaskListComplete(result.topLevel)).toBe(false);
  });

  it('supports task numbers greater than 9 without confusing order or nesting', () => {
    const md = [
      '## Tasks',
      '- [x] 9. Ninth',
      '- [x] 10. Tenth',
      '  - [x] 10.1 Sub',
      '  - [ ] 10.2 Sub',
      '- [x] 11. Eleventh',
    ].join('\n');
    const result = parseTaskList(md);
    expect(result.topLevel.map((t) => t.label)).toEqual(['9', '10', '11']);
    expect(isTaskListComplete(result.topLevel)).toBe(true);
    expect(result.topLevel[1]!.children).toHaveLength(2);
  });

  it('supports CRLF line endings identically to LF', () => {
    const lf = '## Tasks\n- [x] 1. A\n  - [ ] 1.1 sub\n- [ ] 2. B\n';
    const crlf = lf.replace(/\n/g, '\r\n');
    const lfResult = parseTaskList(lf);
    const crlfResult = parseTaskList(crlf);
    expect(crlfResult.topLevel).toHaveLength(lfResult.topLevel.length);
    expect(crlfResult.topLevel.map((t) => t.title)).toEqual(lfResult.topLevel.map((t) => t.title));
    expect(isTaskListComplete(crlfResult.topLevel)).toBe(isTaskListComplete(lfResult.topLevel));
  });

  it('tolerates malformed checkbox lines with a warning instead of throwing', () => {
    const md = ['## Tasks', '- [x] 1. Good task', '- [?] 2. broken checkbox', '- [ ] 3. Fine'].join('\n');
    expect(() => parseTaskList(md)).not.toThrow();
    const result = parseTaskList(md);
    expect(result.warnings.length).toBeGreaterThan(0);
    // The malformed line is skipped, not misparsed as a task.
    expect(result.topLevel.map((t) => t.label)).toEqual(['1', '3']);
  });

  it('handles duplicate or unusual numbering without breaking top-level detection', () => {
    const md = ['## Tasks', '- [x] 1. First', '- [x] 1. Duplicate label', '- [ ] weird-label Something'].join('\n');
    const result = parseTaskList(md);
    expect(result.topLevel).toHaveLength(3);
    expect(isTaskListComplete(result.topLevel)).toBe(false);
  });

  it('supports arbitrarily deep nesting without counting nested levels as top-level', () => {
    const md = [
      '## Tasks',
      '- [x] 1. Top',
      '  - [x] 1.1 Mid',
      '    - [ ] 1.1.1 Deep unchecked',
      '- [x] 2. Top2',
    ].join('\n');
    const result = parseTaskList(md);
    expect(result.topLevel).toHaveLength(2);
    expect(isTaskListComplete(result.topLevel)).toBe(true);
    expect(countAllTasks(result.topLevel)).toBe(4);
  });

  it('respects a custom section heading name', () => {
    const md = ['## Implementation Plan', '- [x] 1. A'].join('\n');
    const result = parseTaskList(md, { sectionHeading: 'Implementation Plan' });
    expect(result.sectionFound).toBe(true);
    expect(result.topLevel).toHaveLength(1);
  });
});
