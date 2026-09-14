import path from 'node:path';
import type { CreateSpecificationInput, ProviderContext, SddProvider } from '../../core/models/provider.js';
import type { Specification, SpecificationSummary } from '../../core/models/specification.js';
import { summarize } from '../../core/models/specification.js';
import { deriveBaseStatus } from '../../core/lifecycle/derive-status.js';
import { parseTaskList } from '../../core/tasks/parse-task-list.js';
import { findFilesNamed, pathExists, readFileIfExists, writeFileEnsuringDir } from '../../utils/fs.js';
import { actionable } from '../../utils/errors.js';

export const KIRO_SPECS_DIR = path.join('.kiro', 'specs');
export const KIRO_PROVIDER_ID = 'kiro';

function specDir(projectRoot: string, specId: string): string {
  // specId may itself contain path separators for nested specs; keep it portable.
  return path.join(projectRoot, KIRO_SPECS_DIR, ...specId.split('/'));
}

function toSpecId(specsRoot: string, tasksFilePath: string): string {
  const dir = path.dirname(tasksFilePath);
  const rel = path.relative(specsRoot, dir);
  return rel.split(path.sep).join('/');
}

function deriveTitle(specId: string, requirements: string | undefined): string {
  if (requirements) {
    const heading = /^#\s+(.+)$/m.exec(requirements);
    if (heading?.[1]) return heading[1].trim();
  }
  return specId;
}

async function readSpecification(projectRoot: string, specId: string): Promise<Specification | undefined> {
  const dir = specDir(projectRoot, specId);
  const tasksPath = path.join(dir, 'tasks.md');
  if (!(await pathExists(tasksPath))) return undefined;

  const requirementsPath = path.join(dir, 'requirements.md');
  const designPath = path.join(dir, 'design.md');

  const [requirements, design, tasksRaw] = await Promise.all([
    readFileIfExists(requirementsPath),
    readFileIfExists(designPath),
    readFileIfExists(tasksPath),
  ]);

  // Kiro's completion contract: ONLY top-level entries under "## Tasks" count.
  // Nested subtasks (e.g. 1.1, 1.2 under 1.) are organizational detail and
  // must never independently mark a specification complete or incomplete.
  const tasks = parseTaskList(tasksRaw ?? '', { sectionHeading: 'Tasks' });
  const status = deriveBaseStatus({
    hasRequirements: requirements !== undefined,
    hasDesign: design !== undefined,
    tasks,
  });

  return {
    identity: { id: specId, provider: KIRO_PROVIDER_ID },
    title: deriveTitle(specId, requirements),
    artifacts: {
      requirementsPath: requirements !== undefined ? requirementsPath : undefined,
      designPath: design !== undefined ? designPath : undefined,
      tasksPath,
    },
    requirements,
    design,
    tasks,
    status,
    handoffId: undefined,
  };
}

export const kiroProvider: SddProvider = {
  id: KIRO_PROVIDER_ID,
  displayName: 'Kiro (.kiro/specs)',

  async isApplicable(ctx: ProviderContext): Promise<boolean> {
    return pathExists(path.join(ctx.projectRoot, KIRO_SPECS_DIR));
  },

  async discover(ctx: ProviderContext): Promise<SpecificationSummary[]> {
    const specsRoot = path.join(ctx.projectRoot, KIRO_SPECS_DIR);
    const tasksFiles = await findFilesNamed(specsRoot, 'tasks.md');
    const summaries: SpecificationSummary[] = [];
    for (const tasksFile of tasksFiles) {
      const id = toSpecId(specsRoot, tasksFile);
      const spec = await readSpecification(ctx.projectRoot, id);
      if (spec) summaries.push(summarize(spec));
    }
    return summaries;
  },

  async read(ctx: ProviderContext, specId: string): Promise<Specification | undefined> {
    return readSpecification(ctx.projectRoot, specId);
  },

  async create(ctx: ProviderContext, input: CreateSpecificationInput): Promise<Specification> {
    const dir = specDir(ctx.projectRoot, input.id);
    if (await pathExists(path.join(dir, 'tasks.md'))) {
      throw actionable('SPEC_EXISTS', `A Kiro specification named "${input.id}" already exists at ${dir}.`);
    }

    const requirements = input.requirements ?? `# ${input.title}\n\n## Requirements\n\n- TBD\n`;
    const design = input.design ?? `# ${input.title} — Design\n\n## Overview\n\n- TBD\n`;
    const tasksBody = input.tasksBody ?? '- [ ] 1. TBD\n';
    const tasks = `# ${input.title} — Implementation Plan\n\n## Tasks\n\n${tasksBody}`;

    await Promise.all([
      writeFileEnsuringDir(path.join(dir, 'requirements.md'), requirements),
      writeFileEnsuringDir(path.join(dir, 'design.md'), design),
      writeFileEnsuringDir(path.join(dir, 'tasks.md'), tasks),
    ]);

    const spec = await readSpecification(ctx.projectRoot, input.id);
    if (!spec) {
      throw actionable('SPEC_CREATE_FAILED', `Failed to create Kiro specification "${input.id}".`);
    }
    return spec;
  },
};
