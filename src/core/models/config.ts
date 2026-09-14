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

export const DEFAULT_CONFIG: SddConfig = {
  provider: 'auto',
  handoffNotifications: true,
};

export function mergeConfig(partial: Partial<SddConfig> | undefined): SddConfig {
  return { ...DEFAULT_CONFIG, ...partial };
}
