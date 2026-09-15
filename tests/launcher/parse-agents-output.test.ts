import { describe, expect, it } from 'vitest';
import {
  extractIdsFromAgentsJson,
  extractSessionId,
  extractSessionIdFromBgOutput,
} from '../../src/launcher/parse-agents-output.js';

describe('extractSessionIdFromBgOutput', () => {
  it('parses the real `claude --bg` stdout shape', () => {
    const output = [
      'backgrounded · 11b6a0fe',
      '  claude agents             list sessions',
      '  claude attach 11b6a0fe    open in this terminal',
      '  claude logs 11b6a0fe      show recent output',
      '  claude stop 11b6a0fe      stop this session',
      '',
    ].join('\n');
    expect(extractSessionIdFromBgOutput(output)).toBe('11b6a0fe');
  });

  it('resolves from the "backgrounded" line alone', () => {
    expect(extractSessionIdFromBgOutput('backgrounded · abc123')).toBe('abc123');
  });

  it('resolves from the "claude attach" hint line alone', () => {
    expect(extractSessionIdFromBgOutput('  claude attach abc123    open in this terminal')).toBe('abc123');
  });

  it('returns undefined when the two anchors disagree', () => {
    const output = 'backgrounded · abc123\n  claude attach def456    open in this terminal';
    expect(extractSessionIdFromBgOutput(output)).toBeUndefined();
  });

  it('returns undefined when neither anchor is present', () => {
    expect(extractSessionIdFromBgOutput('something unrelated')).toBeUndefined();
  });
});

describe('extractSessionId', () => {
  it('resolves the single known id that appears in the captured output', () => {
    const output = 'Started background session abc123. Attach with claude attach abc123.';
    expect(extractSessionId(output, ['zzz999', 'abc123'])).toBe('abc123');
  });

  it('returns undefined when no known id appears in the output', () => {
    expect(extractSessionId('something unrelated', ['abc123'])).toBeUndefined();
  });

  it('returns undefined (never guesses) when multiple known ids appear in the output', () => {
    const output = 'abc123 and def456 were both mentioned';
    expect(extractSessionId(output, ['abc123', 'def456'])).toBeUndefined();
  });

  it('returns undefined for an empty candidate list', () => {
    expect(extractSessionId('abc123', [])).toBeUndefined();
  });
});

describe('extractIdsFromAgentsJson', () => {
  it('parses a bare array of id strings', () => {
    expect(extractIdsFromAgentsJson('["a","b","c"]')).toEqual(['a', 'b', 'c']);
  });

  it('parses an array of objects using "id"', () => {
    expect(extractIdsFromAgentsJson('[{"id":"a"},{"id":"b"}]')).toEqual(['a', 'b']);
  });

  it('parses an array of objects using "sessionId" or "session_id"', () => {
    expect(extractIdsFromAgentsJson('[{"sessionId":"a"},{"session_id":"b"}]')).toEqual(['a', 'b']);
  });

  it('parses a wrapper object with an "agents" array', () => {
    expect(extractIdsFromAgentsJson('{"agents":[{"id":"a"}]}')).toEqual(['a']);
  });

  it('returns an empty list for malformed JSON instead of throwing', () => {
    expect(() => extractIdsFromAgentsJson('{ not json')).not.toThrow();
    expect(extractIdsFromAgentsJson('{ not json')).toEqual([]);
  });

  it('returns an empty list for unrecognized shapes', () => {
    expect(extractIdsFromAgentsJson('{"unexpected":true}')).toEqual([]);
  });
});
