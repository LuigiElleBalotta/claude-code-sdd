import { describe, expect, it } from 'vitest';
import { LauncherStateMachine } from '../../src/launcher/launcher-state-machine.js';

describe('LauncherStateMachine (pure — no real process ever involved)', () => {
  it('starts by requesting a background session', () => {
    const m = new LauncherStateMachine();
    expect(m.start()).toEqual([{ type: 'startBackground' }]);
    expect(m.getPhase()).toBe('starting');
  });

  it('attaches once the session has started', () => {
    const m = new LauncherStateMachine();
    m.start();
    const actions = m.handle({ type: 'started', id: 'abc123' });
    expect(actions).toEqual([{ type: 'attach', id: 'abc123' }]);
    expect(m.getPhase()).toBe('attached');
    expect(m.getCurrentId()).toBe('abc123');
  });

  it('a detected boundary while attached stops the current session', () => {
    const m = new LauncherStateMachine();
    m.start();
    m.handle({ type: 'started', id: 'abc123' });
    const actions = m.handle({ type: 'boundaryDetected' });
    expect(actions).toEqual([{ type: 'stopCurrent', id: 'abc123' }]);
    expect(m.getPhase()).toBe('stopping');
  });

  it('after we stopped it ourselves, a child exit restarts (startBackground again)', () => {
    const m = new LauncherStateMachine();
    m.start();
    m.handle({ type: 'started', id: 'abc123' });
    m.handle({ type: 'boundaryDetected' });
    const actions = m.handle({ type: 'childExited', code: 0, signal: null });
    expect(actions).toEqual([{ type: 'startBackground' }]);
    expect(m.getPhase()).toBe('starting');
  });

  it('a full restart cycle can repeat: started -> attach -> boundary -> stop -> restart -> started -> attach', () => {
    const m = new LauncherStateMachine();
    m.start();
    m.handle({ type: 'started', id: 'session-1' });
    m.handle({ type: 'boundaryDetected' });
    m.handle({ type: 'childExited', code: 0, signal: null });
    const actions = m.handle({ type: 'started', id: 'session-2' });
    expect(actions).toEqual([{ type: 'attach', id: 'session-2' }]);
    expect(m.getCurrentId()).toBe('session-2');
  });

  it('a child exit we did NOT initiate (user quit) exits instead of restarting', () => {
    const m = new LauncherStateMachine();
    m.start();
    m.handle({ type: 'started', id: 'abc123' });
    // No boundaryDetected — the user just ended the session themselves.
    const actions = m.handle({ type: 'childExited', code: 0, signal: null });
    expect(actions).toEqual([{ type: 'exit', code: 0 }]);
    expect(m.getPhase()).toBe('stopped');
  });

  it('propagates a non-zero exit code from an uninitiated child exit', () => {
    const m = new LauncherStateMachine();
    m.start();
    m.handle({ type: 'started', id: 'abc123' });
    const actions = m.handle({ type: 'childExited', code: 17, signal: null });
    expect(actions).toEqual([{ type: 'exit', code: 17 }]);
  });

  it('a boundary detected before attaching is a no-op (nothing to stop yet)', () => {
    const m = new LauncherStateMachine();
    m.start();
    // Still in "starting" phase — no session id yet.
    const actions = m.handle({ type: 'boundaryDetected' });
    expect(actions).toEqual([]);
    expect(m.getPhase()).toBe('starting');
  });

  it('a boundary detected while already stopping is a no-op (does not double-stop)', () => {
    const m = new LauncherStateMachine();
    m.start();
    m.handle({ type: 'started', id: 'abc123' });
    m.handle({ type: 'boundaryDetected' });
    const actions = m.handle({ type: 'boundaryDetected' });
    expect(actions).toEqual([]);
  });

  it('a start failure warns and exits non-zero, never restarts', () => {
    const m = new LauncherStateMachine();
    m.start();
    const actions = m.handle({ type: 'startFailed', message: 'boom' });
    expect(actions).toEqual([
      { type: 'warn', message: expect.stringContaining('boom') },
      { type: 'exit', code: 1 },
    ]);
    expect(m.getPhase()).toBe('stopped');
  });

  it('a stop failure warns and exits non-zero rather than looping forever', () => {
    const m = new LauncherStateMachine();
    m.start();
    m.handle({ type: 'started', id: 'abc123' });
    m.handle({ type: 'boundaryDetected' });
    const actions = m.handle({ type: 'stopFailed', message: 'stop broke' });
    expect(actions).toEqual([
      { type: 'warn', message: expect.stringContaining('stop broke') },
      { type: 'exit', code: 1 },
    ]);
  });

  it('trips the restart-loop breaker after too many restarts in the window, and stops for good', () => {
    let now = 0;
    const m = new LauncherStateMachine({ maxRestartsPerWindow: 3, restartWindowMs: 1000, now: () => now });
    m.start();
    m.handle({ type: 'started', id: 's0' });

    // Three restarts happen quickly (within the 1000ms window).
    for (let i = 1; i <= 3; i++) {
      m.handle({ type: 'boundaryDetected' });
      const actions = m.handle({ type: 'childExited', code: 0, signal: null });
      expect(actions).toEqual([{ type: 'startBackground' }]);
      m.handle({ type: 'started', id: `s${i}` });
      now += 10; // still well within the window
    }

    // The 4th one trips the breaker instead of restarting again.
    m.handle({ type: 'boundaryDetected' });
    const actions = m.handle({ type: 'childExited', code: 0, signal: null });
    expect(actions[0]).toMatchObject({ type: 'warn' });
    expect(actions[1]).toEqual({ type: 'exit', code: 0 });
    expect(m.getPhase()).toBe('stopped');
  });

  it('does not trip the breaker when restarts are spread outside the window', () => {
    let now = 0;
    const m = new LauncherStateMachine({ maxRestartsPerWindow: 2, restartWindowMs: 1000, now: () => now });
    m.start();
    m.handle({ type: 'started', id: 's0' });

    m.handle({ type: 'boundaryDetected' });
    m.handle({ type: 'childExited', code: 0, signal: null }); // restart 1
    m.handle({ type: 'started', id: 's1' });

    now += 5000; // well outside the 1000ms window — old restart ages out

    m.handle({ type: 'boundaryDetected' });
    const actions = m.handle({ type: 'childExited', code: 0, signal: null }); // restart 2, not tripped
    expect(actions).toEqual([{ type: 'startBackground' }]);
  });
});
