import { spawn } from 'node:child_process';
import { actionable } from '../utils/errors.js';
import type { AttachHandle, SessionHost, StartResult } from './session-host.js';
import { extractIdsFromAgentsJson, extractSessionId } from './parse-agents-output.js';
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
 * confirmed against the real `claude` binary during development (a
 * background session was started, listed via `agents --json`, and cleaned
 * up with `stop` + `rm`) — see docs/context-boundaries.md for exactly what
 * that confirmed and what is still unverified (the id-extraction path in
 * particular was not cleanly observed end-to-end in that run).
 */
export class RealSessionHost implements SessionHost {
  constructor(private readonly cwd: string) {}

  async startBackground(extraArgs: readonly string[] = []): Promise<StartResult> {
    const { stdout, stderr, code } = await runCaptured(this.cwd, ['--bg', ...extraArgs]);
    if (code !== 0) {
      throw actionable(
        'LAUNCH_START_FAILED',
        `"claude --bg${extraArgs.length ? ' ' + extraArgs.join(' ') : ''}" exited with code ${code}.\nstdout: ${stdout}\nstderr: ${stderr}`,
      );
    }

    const ids = await this.listIds();
    const id = extractSessionId(`${stdout}\n${stderr}`, ids);
    if (!id) {
      throw actionable(
        'LAUNCH_ID_UNRESOLVED',
        'Could not determine the session id "claude --bg" just created from its output. ' +
          `Known session ids: [${ids.join(', ')}]. Captured output:\nstdout: ${stdout}\nstderr: ${stderr}\n` +
          'This is a parsing gap in claude-code-sdd, not a sign anything is broken — please file an issue with the output above.',
      );
    }
    return { id };
  }

  attach(id: string): AttachHandle {
    const child = spawn(buildCommandLine('claude', ['attach', id]), { stdio: 'inherit', shell: true });
    const exited = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => {
      child.on('exit', (code, signal) => resolve({ code, signal }));
      child.on('error', () => resolve({ code: 1, signal: null }));
    });
    return {
      exited,
      killView(): void {
        if (!child.killed) child.kill();
      },
    };
  }

  async stop(id: string): Promise<void> {
    const { code, stderr } = await runCaptured(this.cwd, ['stop', id]);
    if (code !== 0) {
      throw actionable('LAUNCH_STOP_FAILED', `"claude stop ${id}" exited with code ${code}.\nstderr: ${stderr}`);
    }
  }

  async listIds(): Promise<string[]> {
    const { stdout, code } = await runCaptured(this.cwd, ['agents', '--json']);
    if (code !== 0) return [];
    return extractIdsFromAgentsJson(stdout);
  }
}

interface CapturedResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly code: number | null;
}

function runCaptured(cwd: string, args: readonly string[]): Promise<CapturedResult> {
  return new Promise((resolve) => {
    const child = spawn(buildCommandLine('claude', args), { cwd, shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk: Buffer) => (stdout += chunk.toString('utf8')));
    child.stderr?.on('data', (chunk: Buffer) => (stderr += chunk.toString('utf8')));
    child.on('close', (code) => resolve({ stdout, stderr, code }));
    child.on('error', (err) => resolve({ stdout, stderr: `${stderr}\n${String(err)}`, code: 1 }));
  });
}
