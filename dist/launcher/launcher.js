import { LauncherStateMachine } from './launcher-state-machine.js';
import { RealSessionHost } from './real-session-host.js';
import { watchForContextBoundary } from './watch-context-boundary.js';
/**
 * Wires the pure `LauncherStateMachine` to a real (or injected) `SessionHost`
 * and a `.claude/` filesystem watcher. This function itself never runs a
 * nested Claude Code session when `options.host` is a fake — only when the
 * default `RealSessionHost` is used, i.e. only when a human runs
 * `claude-sdd launch` from their own top-level shell. Nothing in this
 * plugin's hooks or skills ever calls this function or `claude` directly —
 * see docs/context-boundaries.md.
 */
export async function runLauncher(projectRoot, options = {}) {
    const host = options.host ?? new RealSessionHost(projectRoot);
    const log = options.log ?? ((message) => void process.stderr.write(`[claude-sdd launch] ${message}\n`));
    const claudeArgs = options.claudeArgs ?? [];
    const machine = new LauncherStateMachine();
    let currentAttach;
    let resolveExit;
    const exitPromise = new Promise((resolve) => {
        resolveExit = resolve;
    });
    const watcher = watchForContextBoundary(projectRoot, () => {
        for (const action of machine.handle({ type: 'boundaryDetected' })) {
            void perform(action);
        }
    });
    async function perform(action) {
        switch (action.type) {
            case 'startBackground': {
                log('Starting a new background session...');
                try {
                    const { id } = await host.startBackground(claudeArgs);
                    for (const next of machine.handle({ type: 'started', id }))
                        await perform(next);
                }
                catch (err) {
                    for (const next of machine.handle({ type: 'startFailed', message: String(err) }))
                        await perform(next);
                }
                return;
            }
            case 'attach': {
                log(`Attaching to session ${action.id}...`);
                currentAttach = host.attach(action.id);
                void currentAttach.exited.then(({ code, signal }) => {
                    currentAttach = undefined;
                    for (const next of machine.handle({ type: 'childExited', code, signal }))
                        void perform(next);
                });
                return;
            }
            case 'stopCurrent': {
                log(`SDD context boundary requested — stopping session ${action.id} for a fresh restart...`);
                try {
                    await host.stop(action.id);
                    // The attach view is expected to exit on its own once the
                    // underlying session stops; force it after a grace period as a
                    // last-resort safety net (see AttachHandle.killView's contract).
                    const timer = setTimeout(() => currentAttach?.killView(), 5000);
                    timer.unref?.();
                }
                catch (err) {
                    for (const next of machine.handle({ type: 'stopFailed', message: String(err) }))
                        await perform(next);
                }
                return;
            }
            case 'warn':
                log(action.message);
                return;
            case 'exit':
                watcher.stop();
                resolveExit?.(action.code);
                return;
        }
    }
    for (const action of machine.start())
        await perform(action);
    return exitPromise;
}
//# sourceMappingURL=launcher.js.map