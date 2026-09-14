export type ProviderSelection = 'auto' | 'kiro' | 'generic';
export interface SddConfig {
    /**
     * Which provider to use. "auto" (default) picks Kiro when `.kiro/specs`
     * exists, otherwise falls back to the generic provider.
     */
    readonly provider: ProviderSelection;
    /** Whether a Stop-hook handoff notice fires when a specification completes. */
    readonly handoffNotifications: boolean;
}
export declare const DEFAULT_CONFIG: SddConfig;
export declare function mergeConfig(partial: Partial<SddConfig> | undefined): SddConfig;
//# sourceMappingURL=config.d.ts.map