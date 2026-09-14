#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { createEngine } from '../create-engine.js';
import { loadConfig } from '../config/load-config.js';
import { SddError } from '../utils/errors.js';
import { printError, printLine } from './output.js';
import { runDetect } from './commands/detect.js';
import { runStatus } from './commands/status.js';
import { runValidate } from './commands/validate.js';
import { runInit } from './commands/init.js';
import { runHandoff } from './commands/handoff.js';
import { runLaunch } from './commands/launch.js';

const USAGE = `claude-sdd — Spec-Driven Development engine for Claude Code

Usage:
  claude-sdd detect [--json]              Show which SDD provider is active
  claude-sdd status [--json]              Show specification status and progress
  claude-sdd validate [--json]             Validate specification structure (exit 1 on issues)
  claude-sdd init <id> [--title <title>]  Create a new specification
  claude-sdd handoff [--ack <id>] [--json] Show or acknowledge a pending handoff
  claude-sdd launch [--force] [--cwd <path>] [-- <claude args...>]
                                           Managed mode: supervise Claude Code and auto-restart
                                           it when an SDD context boundary is requested. Run
                                           this from your own shell, never from inside Claude
                                           Code itself. Anything after a lone "--" is forwarded
                                           verbatim after "claude --bg" on every session started
                                           (e.g. --dangerously-skip-permissions, --model, ...).

Options:
  --cwd <path>   Project root to operate on (default: current directory)
  --json         Emit machine-readable JSON instead of text
  --help         Show this message
`;

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    printLine(USAGE);
    return command ? 0 : 1;
  }

  const rest = args.slice(1);

  if (command === 'launch') {
    // Handled before the strict parseArgs below: anything after "--" is
    // arbitrary `claude` flags, which parseArgs' fixed option set would
    // otherwise reject.
    const dashIndex = rest.indexOf('--');
    const ownArgs = dashIndex === -1 ? rest : rest.slice(0, dashIndex);
    const claudeArgs = dashIndex === -1 ? [] : rest.slice(dashIndex + 1);
    const force = ownArgs.includes('--force');
    const cwdIndex = ownArgs.indexOf('--cwd');
    const projectRoot = cwdIndex !== -1 && ownArgs[cwdIndex + 1] ? ownArgs[cwdIndex + 1]! : process.cwd();
    return runLaunch(projectRoot, { force, claudeArgs });
  }

  const { values, positionals } = parseArgs({
    args: rest,
    allowPositionals: true,
    options: {
      json: { type: 'boolean', default: false },
      cwd: { type: 'string' },
      title: { type: 'string' },
      ack: { type: 'string' },
    },
  });

  const projectRoot = values.cwd ?? process.cwd();
  const ctx = { projectRoot };
  const config = await loadConfig(projectRoot);
  const engine = createEngine();
  const json = values.json === true;

  switch (command) {
    case 'detect':
      return runDetect(engine, ctx, config, json);
    case 'status':
      return runStatus(engine, ctx, config, json);
    case 'validate':
      return runValidate(engine, ctx, config, json);
    case 'init': {
      const id = positionals[0];
      if (!id) {
        printError('Usage: claude-sdd init <id> [--title <title>]');
        return 1;
      }
      return runInit(engine, ctx, config, { id, title: values.title }, json);
    }
    case 'handoff':
      return runHandoff(engine, ctx, config, values.ack, json);
    default:
      printError(`Unknown command: ${command}\n`);
      printLine(USAGE);
      return 1;
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err: unknown) => {
    if (err instanceof SddError) {
      printError(`Error: ${err.message}`);
      process.exit(1);
    }
    printError('Unexpected error:');
    console.error(err);
    process.exit(1);
  });
