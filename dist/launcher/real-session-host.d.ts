import type { AttachHandle, SessionHost, StartResult } from './session-host.js';
/**
 * Every command here is exactly one documented `claude` subcommand
 * (`--bg`, `attach`, `stop`, `agents --json`) — no signals sent to the
 * `claude` process, no terminal automation. `shell: true` is used (needed so
 * Windows resolves the npm-installed `claude` shim), but never with a raw
 * args array — Node explicitly warns that combination is an injection risk,
 * since the array is concatenated unescaped. `buildCommandLine` quotes each
 * argument itself and hands `spawn` one fully-formed string instead.
 *
 * The `--bg` / `attach` / `stop` / `agents --json` behavior itself HAS been
 * confirmed against the real `claude` binary — see docs/context-boundaries.md.
 * `claude --bg`'s stdout was also confirmed in the wild to print the id
 * directly (`backgrounded · <id>`, plus a `claude attach <id>` hint line),
 * so `startBackground` reads it from there first and only falls back to
 * cross-checking `agents --json` if that text doesn't match — `agents --json`
 * had been observed to come back empty right after a session starts, which
 * previously left a real id undiscovered.
 */
export declare class RealSessionHost implements SessionHost {
    private readonly cwd;
    constructor(cwd: string);
    startBackground(extraArgs?: readonly string[]): Promise<StartResult>;
    attach(id: string): AttachHandle;
    stop(id: string): Promise<void>;
    listIds(): Promise<string[]>;
}
//# sourceMappingURL=real-session-host.d.ts.map