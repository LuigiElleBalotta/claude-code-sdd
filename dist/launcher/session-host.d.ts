/**
 * The interface the launcher's state machine drives. Kept separate from any
 * real process-spawning code so the state machine (`launcher-state-machine.ts`)
 * can be unit-tested against a fake host, with no real `claude` process ever
 * started — see `tests/launcher/launcher-state-machine.test.ts`.
 *
 * Every method here maps to one officially documented `claude` CLI command.
 * Nothing in this file (or its real implementation) sends a signal to, or
 * otherwise manipulates, the `claude` process directly — only its own
 * subcommands are used (`--bg`, `attach`, `stop`, `agents --json`).
 */
export interface StartResult {
    readonly id: string;
}
export interface AttachHandle {
    /** Resolves when the local attach view process exits, for whatever reason. */
    readonly exited: Promise<{
        code: number | null;
        signal: NodeJS.Signals | null;
    }>;
    /**
     * Terminates the local attach VIEW process only, as a last-resort safety
     * net (e.g. it didn't exit within a grace period after `stop()`). This
     * never touches the background agent itself — that is only ever ended via
     * `stop()`, which is a documented `claude` subcommand, not a signal.
     */
    killView(): void;
}
export interface SessionHost {
    /**
     * `claude --bg` with no prompt — a plain new session, backgrounded.
     * `extraArgs` are forwarded verbatim after `--bg` (e.g.
     * `--dangerously-skip-permissions`, `--model`, `--permission-mode`,
     * `--add-dir`) so every restart keeps the same session configuration the
     * launcher was started with, not just the first one.
     */
    startBackground(extraArgs?: readonly string[]): Promise<StartResult>;
    /** `claude attach <id>`, taking over the current terminal in the foreground. */
    attach(id: string): AttachHandle;
    /** `claude stop <id>` — documented, graceful; the conversation is kept. */
    stop(id: string): Promise<void>;
    /** `claude agents --json` — used only to validate an id exists, never to guess one. */
    listIds(): Promise<string[]>;
}
//# sourceMappingURL=session-host.d.ts.map