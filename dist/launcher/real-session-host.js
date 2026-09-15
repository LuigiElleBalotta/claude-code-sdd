import { spawn } from 'node:child_process';
import { actionable } from '../utils/errors.js';
import { extractIdsFromAgentsJson, extractSessionId, extractSessionIdFromBgOutput } from './parse-agents-output.js';
import { buildCommandLine } from './shell-quote.js';
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
export class RealSessionHost {
    cwd;
    constructor(cwd) {
        this.cwd = cwd;
    }
    async startBackground(extraArgs = []) {
        const { stdout, stderr, code } = await runCaptured(this.cwd, ['--bg', ...extraArgs]);
        if (code !== 0) {
            throw actionable('LAUNCH_START_FAILED', `"claude --bg${extraArgs.length ? ' ' + extraArgs.join(' ') : ''}" exited with code ${code}.\nstdout: ${stdout}\nstderr: ${stderr}`);
        }
        const combinedOutput = `${stdout}\n${stderr}`;
        let id = extractSessionIdFromBgOutput(combinedOutput);
        let ids = [];
        if (!id) {
            ids = await this.listIds();
            id = extractSessionId(combinedOutput, ids);
        }
        if (!id) {
            throw actionable('LAUNCH_ID_UNRESOLVED', 'Could not determine the session id "claude --bg" just created from its output. ' +
                `Known session ids: [${ids.join(', ')}]. Captured output:\nstdout: ${stdout}\nstderr: ${stderr}\n` +
                'This is a parsing gap in claude-code-sdd, not a sign anything is broken — please file an issue with the output above.');
        }
        return { id };
    }
    attach(id) {
        const child = spawn(buildCommandLine('claude', ['attach', id]), { stdio: 'inherit', shell: true });
        const exited = new Promise((resolve) => {
            child.on('exit', (code, signal) => resolve({ code, signal }));
            child.on('error', () => resolve({ code: 1, signal: null }));
        });
        return {
            exited,
            killView() {
                if (!child.killed)
                    child.kill();
            },
        };
    }
    async stop(id) {
        const { code, stderr } = await runCaptured(this.cwd, ['stop', id]);
        if (code !== 0) {
            throw actionable('LAUNCH_STOP_FAILED', `"claude stop ${id}" exited with code ${code}.\nstderr: ${stderr}`);
        }
    }
    async listIds() {
        const { stdout, code } = await runCaptured(this.cwd, ['agents', '--json']);
        if (code !== 0)
            return [];
        return extractIdsFromAgentsJson(stdout);
    }
}
function runCaptured(cwd, args) {
    return new Promise((resolve) => {
        const child = spawn(buildCommandLine('claude', args), { cwd, shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';
        child.stdout?.on('data', (chunk) => (stdout += chunk.toString('utf8')));
        child.stderr?.on('data', (chunk) => (stderr += chunk.toString('utf8')));
        child.on('close', (code) => resolve({ stdout, stderr, code }));
        child.on('error', (err) => resolve({ stdout, stderr: `${stderr}\n${String(err)}`, code: 1 }));
    });
}
//# sourceMappingURL=real-session-host.js.map