#!/usr/bin/env node
import { createEngine } from '../../create-engine.js';
import { loadConfig } from '../../config/load-config.js';
import { resolveProjectRoot, emitHookOutput } from '../hook-context.js';
import { describeForStop } from '../describe-sync.js';

async function main(): Promise<void> {
  const projectRoot = resolveProjectRoot();
  try {
    const config = await loadConfig(projectRoot);
    if (!config.handoffNotifications) {
      emitHookOutput('Stop', undefined);
      return;
    }
    const engine = createEngine();
    const result = await engine.sync({ projectRoot }, config);
    emitHookOutput('Stop', describeForStop(result));
  } catch {
    emitHookOutput('Stop', undefined);
  }
}

void main();
