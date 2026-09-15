import { runLauncher } from '../../launcher/launcher.js';
import { worktreeIsolationWarning } from '../../launcher/check-worktree-isolation.js';
import { printError, printLine } from '../output.js';

export interface LaunchOptions {
  readonly force: boolean;
  /** Forwarded verbatim after `claude --bg` on every session this launcher starts. */
  readonly claudeArgs: readonly string[];
}

/**
 * `claude-sdd launch` starts Claude Code's official background-session
 * lifecycle (`claude --bg` / `attach` / `stop`) under a supervisor that
 * restarts it automatically when an SDD specification requests a context
 * boundary. It is a top-level command meant to be run from a human's own
 * shell — never from inside a running Claude Code session (that would spawn
 * a nested Claude process). `CLAUDECODE` is set by Claude Code in every
 * process it spawns (confirmed empirically), so it's a reasonably reliable
 * signal to refuse on by default.
 */
export async function runLaunch(projectRoot: string, options: LaunchOptions): Promise<number> {
  if (process.env.CLAUDECODE && !options.force) {
    printError(
      'Refusing to run "claude-sdd launch" from inside an active Claude Code session ' +
        '(CLAUDECODE is set) — this would start a nested Claude Code process. ' +
        'Run this command from your own shell, outside Claude Code. ' +
        'If you are certain this is not nested, re-run with --force.',
    );
    return 1;
  }

  printLine('claude-sdd launch: managed mode. Ctrl+C stops the launcher and the session it owns.');
  if (options.claudeArgs.length > 0) {
    printLine(`Every session is started with: claude --bg ${options.claudeArgs.join(' ')}`);
  }

  const warning = await worktreeIsolationWarning(projectRoot);
  if (warning) printLine(`Warning: ${warning}`);

  return runLauncher(projectRoot, { claudeArgs: options.claudeArgs });
}
