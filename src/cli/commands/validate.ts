import type { ProviderContext } from '../../core/models/provider.js';
import type { SddEngine } from '../../core/engine/sdd-engine.js';
import type { SddConfig } from '../../core/models/config.js';
import { printJson, printLine } from '../output.js';

export interface ValidationIssue {
  readonly specId: string;
  readonly line: number | undefined;
  readonly message: string;
}

export async function runValidate(
  engine: SddEngine,
  ctx: ProviderContext,
  config: SddConfig,
  json: boolean,
): Promise<number> {
  const provider = await engine.resolveProvider(ctx, config);
  const summaries = await provider.discover(ctx);
  const issues: ValidationIssue[] = [];

  for (const summary of summaries) {
    const spec = await provider.read(ctx, summary.identity.id);
    if (!spec) continue;

    if (!spec.tasks.sectionFound) {
      issues.push({ specId: summary.identity.id, line: undefined, message: 'No "## Tasks" section found in tasks.md.' });
    } else if (spec.tasks.topLevel.length === 0) {
      issues.push({ specId: summary.identity.id, line: undefined, message: 'Tasks section has no top-level tasks.' });
    }

    for (const warning of spec.tasks.warnings) {
      issues.push({ specId: summary.identity.id, line: warning.line, message: warning.message });
    }
  }

  if (json) {
    printJson({ provider: provider.id, specCount: summaries.length, issues });
    return issues.length > 0 ? 1 : 0;
  }

  if (summaries.length === 0) {
    printLine('No specifications to validate.');
    return 0;
  }

  if (issues.length === 0) {
    printLine(`All ${summaries.length} specification(s) are structurally valid.`);
    return 0;
  }

  for (const issue of issues) {
    printLine(`${issue.specId}${issue.line ? `:${issue.line}` : ''}: ${issue.message}`);
  }
  return 1;
}
