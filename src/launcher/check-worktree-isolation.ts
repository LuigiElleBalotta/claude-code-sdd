import path from 'node:path';
import os from 'node:os';
import { readFileIfExists } from '../utils/fs.js';

/**
 * `claude attach <id>` moves a session from `background job · unattended` to
 * `background job · attached` — it does not become "interactive" (Claude
 * Code's agent-view docs document that classification persists). Whether the
 * Edit-tool worktree-isolation guard treats attached and unattended sessions
 * identically isn't documented explicitly, but a `claude-sdd launch` session
 * was reported hitting the guard while attached. Until that's confirmed
 * otherwise, treat every managed-mode session as subject to it: see
 * docs/launcher.md ("Limitations") for the full, honest account.
 */
export async function worktreeIsolationWarning(
  projectRoot: string,
  userConfigDir: string = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'),
): Promise<string | undefined> {
  const candidates = [
    path.join(projectRoot, '.claude', 'settings.local.json'),
    path.join(projectRoot, '.claude', 'settings.json'),
    path.join(userConfigDir, 'settings.json'),
  ];

  for (const filePath of candidates) {
    const raw = await readFileIfExists(filePath);
    if (raw === undefined) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }

    const bgIsolation = (parsed as { worktree?: { bgIsolation?: unknown } })?.worktree?.bgIsolation;
    if (bgIsolation === 'none') return undefined;
  }

  return warningMessage(candidates);
}

function warningMessage(candidates: readonly string[]): string {
  const [localSettings, projectSettings] = candidates;
  return (
    'claude-sdd launch runs every session as a background job, and attaching to it ' +
    "does not clear that classification — so Claude Code's Edit-tool worktree-isolation " +
    'guard may stay active for the session\'s whole life, blocking direct edits to this checkout. ' +
    `Add {"worktree": {"bgIsolation": "none"}} to ${projectSettings}, ${localSettings}, ` +
    'or your user-level settings.json (~/.claude/settings.json, or $CLAUDE_CONFIG_DIR/settings.json ' +
    'if that\'s set) if you want managed-mode sessions to edit this checkout directly instead of ' +
    'being isolated into a worktree (requires a Claude Code CLI new enough to support this ' +
    'setting — see docs/launcher.md).'
  );
}
