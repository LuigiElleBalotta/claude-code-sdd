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
export declare function runLaunch(projectRoot: string, options: LaunchOptions): Promise<number>;
//# sourceMappingURL=launch.d.ts.map