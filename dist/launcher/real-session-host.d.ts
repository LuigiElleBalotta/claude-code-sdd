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
 * confirmed against the real `claude` binary during development (a
 * background session was started, listed via `agents --json`, and cleaned
 * up with `stop` + `rm`) — see docs/context-boundaries.md for exactly what
 * that confirmed and what is still unverified (the id-extraction path in
 * particular was not cleanly observed end-to-end in that run).
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