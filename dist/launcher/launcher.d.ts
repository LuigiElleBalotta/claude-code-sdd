import type { SessionHost } from './session-host.js';
export interface RunLauncherOptions {
    /** Injectable for tests; defaults to the real `claude` CLI-backed host. */
    readonly host?: SessionHost;
    readonly log?: (message: string) => void;
    /**
     * Forwarded verbatim after `--bg` on every `claude --bg` call this
     * launcher makes — the initial one and every automatic restart — so
     * flags like `--dangerously-skip-permissions`, `--model`,
     * `--permission-mode`, or `--add-dir` apply consistently across restarts,
     * not just to the first session.
     */
    readonly claudeArgs?: readonly string[];
}
/**
 * Wires the pure `LauncherStateMachine` to a real (or injected) `SessionHost`
 * and a `.claude/` filesystem watcher. This function itself never runs a
 * nested Claude Code session when `options.host` is a fake — only when the
 * default `RealSessionHost` is used, i.e. only when a human runs
 * `claude-sdd launch` from their own top-level shell. Nothing in this
 * plugin's hooks or skills ever calls this function or `claude` directly —
 * see docs/context-boundaries.md.
 */
export declare function runLauncher(projectRoot: string, options?: RunLauncherOptions): Promise<number>;
//# sourceMappingURL=launcher.d.ts.map