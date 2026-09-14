import { describe, expect, it } from 'vitest';
import { extractIdsFromAgentsJson, extractSessionId } from '../../src/launcher/parse-agents-output.js';

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
