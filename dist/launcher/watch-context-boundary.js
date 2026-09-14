import { watch } from 'node:fs';
import path from 'node:path';
import { loadState } from '../core/lifecycle/state-store.js';
/**
 * Watches `<projectRoot>/.claude` for changes and invokes `onBoundary`
 * whenever the persisted state contains at least one specification at
 * `context_boundary`. Never throws: `.claude/` may not exist yet (nothing to
 * watch until a specification first completes), and a state file mid-write
 * may briefly fail to parse (the atomic rename in `state-store.ts` makes this
 * rare; treated as "try again next event", never as a fatal error).
 *
 * Watches the directory, not the file directly — a rename-based atomic write
 * replaces the file's inode, and watching the old inode directly can silently
 * stop delivering events after the first replace on some platforms.
 */
export function watchForContextBoundary(projectRoot, onBoundary, options = {}) {
    const debounceMs = options.debounceMs ?? 250;
    const retryMs = options.retryMs ?? 2000;
    const claudeDir = path.join(projectRoot, '.claude');
    let stopped = false;
    let debounceTimer;
    let retryTimer;
    let watcher;
    const check = () => {
        if (stopped)
            return;
        loadState(projectRoot)
            .then((state) => {
            const hasBoundary = Object.values(state.specs).some((record) => record.status === 'context_boundary');
            if (hasBoundary && !stopped)
                onBoundary();
        })
            .catch(() => {
            // Transient parse race, or the file vanished between events. Ignored
            // on purpose: the next filesystem event (or the next debounce tick)
            // will re-check.
        });
    };
    const scheduleCheck = () => {
        if (debounceTimer)
            clearTimeout(debounceTimer);
        debounceTimer = setTimeout(check, debounceMs);
    };
    const tryStartWatching = () => {
        try {
            watcher = watch(claudeDir, { persistent: true }, () => scheduleCheck());
            return true;
        }
        catch {
            return false;
        }
    };
    if (!tryStartWatching()) {
        retryTimer = setInterval(() => {
            if (stopped)
                return;
            if (tryStartWatching() && retryTimer) {
                clearInterval(retryTimer);
                retryTimer = undefined;
                scheduleCheck();
            }
        }, retryMs);
    }
    else {
        // Catch a boundary that was already pending before this watcher started
        // (e.g. the launcher restarted after a crash).
        scheduleCheck();
    }
    return {
        stop() {
            stopped = true;
            if (debounceTimer)
                clearTimeout(debounceTimer);
            if (retryTimer)
                clearInterval(retryTimer);
            watcher?.close();
        },
    };
}
//# sourceMappingURL=watch-context-boundary.js.map