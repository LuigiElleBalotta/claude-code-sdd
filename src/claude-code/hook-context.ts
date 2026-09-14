export function resolveProjectRoot(): string {
  return process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
}

/** Hooks must never block or crash the session; always exit 0 with best-effort output. */
export async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return '';
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export function emitHookOutput(hookEventName: string, additionalContext: string | undefined): void {
  const output: Record<string, unknown> = {};
  if (additionalContext) {
    output.hookSpecificOutput = { hookEventName, additionalContext };
  }
  process.stdout.write(JSON.stringify(output));
}
