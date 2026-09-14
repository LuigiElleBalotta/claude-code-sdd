import { describe, expect, it } from 'vitest';
import { buildCommandLine, quoteShellArg } from '../../src/launcher/shell-quote.js';

describe('quoteShellArg', () => {
  it('leaves simple flags and ids unquoted', () => {
    expect(quoteShellArg('--dangerously-skip-permissions')).toBe('--dangerously-skip-permissions');
    expect(quoteShellArg('abc123')).toBe('abc123');
    expect(quoteShellArg('opus')).toBe('opus');
  });

  it('quotes a value containing spaces (POSIX)', () => {
    expect(quoteShellArg('hello world', 'linux')).toBe("'hello world'");
  });

  it('quotes a value containing spaces (Windows)', () => {
    expect(quoteShellArg('hello world', 'win32')).toBe('"hello world"');
  });

  it('escapes an embedded single quote on POSIX', () => {
    expect(quoteShellArg("it's", 'linux')).toBe("'it'\\''s'");
  });

  it('escapes an embedded double quote on Windows', () => {
    expect(quoteShellArg('say "hi"', 'win32')).toBe('"say ""hi"""');
  });

  it('quotes an empty string', () => {
    expect(quoteShellArg('', 'linux')).toBe("''");
    expect(quoteShellArg('', 'win32')).toBe('""');
  });

  it('never lets an unquoted argument break out with shell metacharacters', () => {
    const evil = '; rm -rf / #';
    const quoted = quoteShellArg(evil, 'linux');
    expect(quoted.startsWith("'")).toBe(true);
    expect(quoted.endsWith("'")).toBe(true);
  });
});

describe('buildCommandLine', () => {
  it('joins a command and its args into one shell-safe string', () => {
    expect(buildCommandLine('claude', ['attach', 'abc123'], 'linux')).toBe('claude attach abc123');
  });

  it('quotes only the args that need it', () => {
    expect(buildCommandLine('claude', ['--bg', '--model', 'claude opus'], 'linux')).toBe(
      "claude --bg --model 'claude opus'",
    );
  });
});
