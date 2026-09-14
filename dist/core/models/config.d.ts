export type ProviderSelection = 'auto' | 'kiro' | 'generic';
export interface SddConfig {
    /**
     * Which provider to use. "auto" (default) picks Kiro when `.kiro/specs`
     * exists, otherwise falls back to the generic provider.
     */
    readonly provider: ProviderSelection;
    /**
     * Whether the engine reacts to a specification completing at all: produces
     * a `Handoff` and advances its status past `completed`. `false` means
     * completion is still detected and reported (`claude-sdd status`), but
     * nothing is ever produced or persisted for it — pure opt-out.
     */
    readonly handoffNotifications: boolean;
    /**
     * Whether a newly-produced handoff immediately requests a context boundary
     * (`completed` -> `context_boundary`, the default), or stops at
     * `handoff_pending` for a manual `claude-sdd handoff --ack` instead (the
     * pre-0.2 behavior). Only meaningful when `handoffNotifications` is true.
     *
     * This flag does not itself start or stop any process — it only decides
     * which status a completion lands on. Something still has to act on
     * `context_boundary`: either a human starting a fresh Claude Code session,
     * or `claude-sdd launch` (managed mode) doing it automatically. See
     * docs/context-boundaries.md.
     */
    readonly autoContextBoundary: boolean;
}
export declare const DEFAULT_CONFIG: SddConfig;
export declare function mergeConfig(partial: Partial<SddConfig> | undefined): SddConfig;
//# sourceMappingURL=config.d.ts.map