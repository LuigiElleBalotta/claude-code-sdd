/**
 * Pure, side-effect-free state machine for the launcher. It receives events
 * (a session started, a boundary was detected, the attached view exited) and
 * returns actions for the caller to perform (start a background session,
 * attach, stop, warn, exit). No `SessionHost`, no file system, no timers —
 * this is what section 9's "test the launcher's state machine independently
 * from the Claude process itself" refers to, and it is exercised entirely
 * with plain objects in tests.
 */
export type LauncherAction = {
    readonly type: 'startBackground';
} | {
    readonly type: 'attach';
    readonly id: string;
} | {
    readonly type: 'stopCurrent';
    readonly id: string;
} | {
    readonly type: 'warn';
    readonly message: string;
} | {
    readonly type: 'exit';
    readonly code: number;
};
export type LauncherEvent = {
    readonly type: 'started';
    readonly id: string;
} | {
    readonly type: 'startFailed';
    readonly message: string;
} | {
    readonly type: 'boundaryDetected';
} | {
    readonly type: 'stopFailed';
    readonly message: string;
} | {
    readonly type: 'childExited';
    readonly code: number | null;
    readonly signal: NodeJS.Signals | null;
};
export type LauncherPhase = 'idle' | 'starting' | 'attached' | 'stopping' | 'stopped';
type Phase = LauncherPhase;
export interface LauncherStateMachineOptions {
    /** Maximum automatic restarts allowed within `restartWindowMs` before giving up. Default 5. */
    readonly maxRestartsPerWindow?: number;
    /** Sliding window, in ms, over which `maxRestartsPerWindow` applies. Default 60_000. */
    readonly restartWindowMs?: number;
    /** Injectable clock for deterministic tests. Default `Date.now`. */
    readonly now?: () => number;
}
export declare class LauncherStateMachine {
    private phase;
    private currentId;
    /** True only when *this machine* asked the host to stop the current session. */
    private stopInitiatedByUs;
    private readonly restartTimestamps;
    private readonly maxRestartsPerWindow;
    private readonly restartWindowMs;
    private readonly now;
    constructor(options?: LauncherStateMachineOptions);
    getPhase(): Phase;
    getCurrentId(): string | undefined;
    /** Call once to kick things off. */
    start(): LauncherAction[];
    handle(event: LauncherEvent): LauncherAction[];
    private onStarted;
    private onBoundaryDetected;
    private onChildExited;
    private recordRestart;
    private isRestartLoopSuspected;
}
export {};
//# sourceMappingURL=launcher-state-machine.d.ts.map