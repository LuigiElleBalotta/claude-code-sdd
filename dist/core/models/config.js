export const DEFAULT_CONFIG = {
    provider: 'auto',
    handoffNotifications: true,
    autoContextBoundary: true,
};
export function mergeConfig(partial) {
    return { ...DEFAULT_CONFIG, ...partial };
}
//# sourceMappingURL=config.js.map