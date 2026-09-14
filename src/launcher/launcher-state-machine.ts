/**
 * Pure, side-effect-free state machine for the launcher. It receives events
 * (a session started, a boundary was detected, the attached view exited) and
 * returns actions for the caller to perform (start a background session,
 * attach, stop, warn, exit). No `SessionHost`, no file system, no timers —
 * this is what section 9's "test the launcher's state machine independently
 * from the Claude process itself" refers to, and it is exercised entirely
 * with plain objects in tests.
 */

export type LauncherAction =
  | { readonly type: 'startBackground' }
  | { readonly type: 'attach'; readonly id: string }
  | { readonly type: 'stopCurrent'; readonly id: string }
  | { readonly type: 'warn'; readonly message: string }
  | { readonly type: 'exit'; readonly code: number };

export type LauncherEvent =
  | { readonly type: 'started'; readonly id: string }
  | { readonly type: 'startFailed'; readonly message: string }
  | { readonly type: 'boundaryDetected' }
  | { readonly type: 'stopFailed'; readonly message: string }
  | { readonly type: 'childExited'; readonly code: number | null; readonly signal: NodeJS.Signals | null };

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

export class LauncherStateMachine {
  private phase: Phase = 'idle';
  private currentId: string | undefined;
  /** True only when *this machine* asked the host to stop the current session. */
  private stopInitiatedByUs = false;
  private readonly restartTimestamps: number[] = [];

  private readonly maxRestartsPerWindow: number;
  private readonly restartWindowMs: number;
  private readonly now: () => number;

  constructor(options: LauncherStateMachineOptions = {}) {
    this.maxRestartsPerWindow = options.maxRestartsPerWindow ?? 5;
    this.restartWindowMs = options.restartWindowMs ?? 60_000;
    this.now = options.now ?? Date.now;
  }

  getPhase(): Phase {
    return this.phase;
  }

  getCurrentId(): string | undefined {
    return this.currentId;
  }

  /** Call once to kick things off. */
  start(): LauncherAction[] {
    if (this.phase !== 'idle') return [];
    this.phase = 'starting';
    return [{ type: 'startBackground' }];
  }

  handle(event: LauncherEvent): LauncherAction[] {
    switch (event.type) {
      case 'started':
        return this.onStarted(event.id);
      case 'startFailed':
        this.phase = 'stopped';
        return [
          { type: 'warn', message: `Failed to start a background session: ${event.message}` },
          { type: 'exit', code: 1 },
        ];
      case 'boundaryDetected':
        return this.onBoundaryDetected();
      case 'stopFailed':
        this.phase = 'stopped';
        return [
          { type: 'warn', message: `Failed to stop the current session cleanly: ${event.message}` },
          { type: 'exit', code: 1 },
        ];
      case 'childExited':
        return this.onChildExited(event.code);
    }
  }

  private onStarted(id: string): LauncherAction[] {
    if (this.phase !== 'starting') return [];
    this.currentId = id;
    this.phase = 'attached';
    return [{ type: 'attach', id }];
  }

  private onBoundaryDetected(): LauncherAction[] {
    // Only actionable once we're actually attached to a session we started.
    // If we're mid-restart already, or haven't attached yet, there is nothing
    // new to do — the underlying persisted state doesn't disappear, so a
    // still-pending boundary will be seen again once we reach `attached`.
    if (this.phase !== 'attached' || !this.currentId) return [];
    this.stopInitiatedByUs = true;
    this.phase = 'stopping';
    return [{ type: 'stopCurrent', id: this.currentId }];
  }

  private onChildExited(code: number | null): LauncherAction[] {
    const weStoppedIt = this.stopInitiatedByUs;
    this.stopInitiatedByUs = false;
    this.currentId = undefined;

    if (!weStoppedIt) {
      // The user ended the session themselves (or it crashed) — behave like
      // plain `claude` would and just exit, never restart on our own.
      this.phase = 'stopped';
      return [{ type: 'exit', code: code ?? 0 }];
    }

    if (this.isRestartLoopSuspected()) {
      this.phase = 'stopped';
      return [
        {
          type: 'warn',
          message:
            `More than ${this.maxRestartsPerWindow} context boundaries in ${Math.round(this.restartWindowMs / 1000)}s. ` +
            'Disabling automatic restart for this launcher run to avoid a restart loop. ' +
            'Run "claude-sdd status" to inspect specification state.',
        },
        { type: 'exit', code: 0 },
      ];
    }

    this.recordRestart();
    this.phase = 'starting';
    return [{ type: 'startBackground' }];
  }

  private recordRestart(): void {
    this.restartTimestamps.push(this.now());
  }

  private isRestartLoopSuspected(): boolean {
    const cutoff = this.now() - this.restartWindowMs;
    while (this.restartTimestamps.length > 0 && this.restartTimestamps[0]! < cutoff) {
      this.restartTimestamps.shift();
    }
    return this.restartTimestamps.length >= this.maxRestartsPerWindow;
  }
}
