import type { TaskListParseResult, TaskNode, TaskParseWarning } from '../models/task.js';

export interface ParseTaskListOptions {
  /**
   * Heading text (without leading `#`) that starts the tasks section, e.g. "Tasks".
   * Matched case-insensitively against a Markdown ATX heading of any level (## Tasks, ### Tasks, ...).
   * Defaults to "Tasks".
   */
  readonly sectionHeading?: string;
}

const DEFAULT_SECTION_HEADING = 'Tasks';

const HEADING_RE = /^(#{1,6})\s+(.*?)\s*$/;
const CHECKBOX_RE = /^(\s*)-\s*\[([ xX])\]\s?(.*)$/;
const LABEL_RE = /^(\d+(?:\.\d+)*)\.?\s+(.*)$/;

interface StackEntry {
  indent: number;
  node: MutableTaskNode;
}

interface MutableTaskNode {
  label: string | undefined;
  title: string;
  done: boolean;
  children: MutableTaskNode[];
  line: number;
}

/**
 * Parses a Markdown checklist under a named section (default "Tasks") into a
 * tree of tasks, using list indentation — not the task numbering text — to
 * decide what is top-level vs. a nested subtask. This is the provider-neutral
 * rule every SDD provider relies on for completion detection: only the
 * top-level entries determine whether a specification is done.
 *
 * Handles CRLF and LF line endings, ignores checkboxes outside the section,
 * tolerates malformed lines (reported as warnings, never thrown), and does
 * not care how large or unusual task numbers are since numbering is cosmetic.
 */
export function parseTaskList(markdown: string, options: ParseTaskListOptions = {}): TaskListParseResult {
  const sectionHeading = (options.sectionHeading ?? DEFAULT_SECTION_HEADING).toLowerCase();
  const lines = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  const warnings: TaskParseWarning[] = [];

  let sectionLevel: number | null = null;
  let sectionStart = -1;
  let sectionEnd = lines.length;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const heading = HEADING_RE.exec(line);
    if (!heading) continue;
    const level = heading[1]!.length;
    const text = heading[2]!.toLowerCase();

    if (sectionStart === -1) {
      if (text === sectionHeading) {
        sectionLevel = level;
        sectionStart = i + 1;
      }
      continue;
    }

    // We're inside the section: it ends at the next heading of equal-or-higher level.
    if (level <= (sectionLevel ?? 1)) {
      sectionEnd = i;
      break;
    }
  }

  if (sectionStart === -1) {
    return { topLevel: [], warnings: [], sectionFound: false };
  }

  const roots: MutableTaskNode[] = [];
  const stack: StackEntry[] = [];

  for (let i = sectionStart; i < sectionEnd; i++) {
    const rawLine = lines[i] ?? '';
    if (rawLine.trim().length === 0) continue;

    const match = CHECKBOX_RE.exec(rawLine);
    if (!match) {
      // Not a checkbox line inside the Tasks section (e.g. prose, a note).
      // Only flag lines that look like a broken checkbox attempt.
      if (/^\s*-\s*\[/.test(rawLine)) {
        warnings.push({ line: i + 1, message: `Malformed task checkbox: "${rawLine.trim()}"` });
      }
      continue;
    }

    const indent = expandIndent(match[1] ?? '');
    const done = match[2]!.toLowerCase() === 'x';
    const rest = (match[3] ?? '').trim();

    if (rest.length === 0) {
      warnings.push({ line: i + 1, message: 'Task has no title text' });
    }

    const labelMatch = LABEL_RE.exec(rest);
    const label = labelMatch?.[1];
    const title = labelMatch ? (labelMatch[2] ?? '').trim() : rest;

    const node: MutableTaskNode = { label, title: title.length > 0 ? title : rest, done, children: [], line: i + 1 };

    while (stack.length > 0 && stack[stack.length - 1]!.indent >= indent) {
      stack.pop();
    }

    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1]!.node.children.push(node);
    }

    stack.push({ indent, node });
  }

  return { topLevel: roots.map(freeze), warnings, sectionFound: true };
}

function expandIndent(whitespace: string): number {
  let width = 0;
  for (const ch of whitespace) {
    width += ch === '\t' ? 4 : 1;
  }
  return width;
}

function freeze(node: MutableTaskNode): TaskNode {
  return {
    label: node.label,
    title: node.title,
    done: node.done,
    line: node.line,
    children: node.children.map(freeze),
  };
}
