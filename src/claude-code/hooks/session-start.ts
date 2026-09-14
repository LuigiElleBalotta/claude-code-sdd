#!/usr/bin/env node
import { createEngine } from '../../create-engine.js';
import { loadConfig } from '../../config/load-config.js';
import { resolveProjectRoot, emitHookOutput } from '../hook-context.js';
import { describeForSessionStart } from '../describe-sync.js';

async function main(): Promise<void> {
  const projectRoot = resolveProjectRoot();
  try {
    const config = await loadConfig(projectRoot);
    const engine = createEngine();
    const result = await engine.sync({ projectRoot }, config);
    emitHookOutput('SessionStart', describeForSessionStart(result));
  } catch {
    // Hooks must never block a session. Silently emit no context on failure;
    // `claude-sdd detect` / `claude-sdd validate` surface the same problem interactively.
    emitHookOutput('SessionStart', undefined);
  }
}

void main();
