export declare function resolveProjectRoot(): string;
/** Hooks must never block or crash the session; always exit 0 with best-effort output. */
export declare function readStdin(): Promise<string>;
export declare function emitHookOutput(hookEventName: string, additionalContext: string | undefined): void;
//# sourceMappingURL=hook-context.d.ts.map