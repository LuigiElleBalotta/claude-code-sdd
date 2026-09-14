export interface BoundaryWatcherHandle {
    stop(): void;
}
export interface WatchOptions {
    /** Debounce window after a filesystem event before re-reading state. Default 250ms. */
    readonly debounceMs?: number;
    /** How often to retry creating the watcher while `.claude/` doesn't exist yet. Default 2000ms. */
    readonly retryMs?: number;
}
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
export declare function watchForContextBoundary(projectRoot: string, onBoundary: () => void, options?: WatchOptions): BoundaryWatcherHandle;
//# sourceMappingURL=watch-context-boundary.d.ts.map