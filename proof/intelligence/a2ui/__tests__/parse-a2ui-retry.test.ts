import { describe, test, expect } from 'bun:test';
import { parseA2UIResponse, buildA2UIRetryPrompt, A2UI_DELIMITER } from '../parse-a2ui';

describe('buildA2UIRetryPrompt', () => {
  test('returns a prompt string containing the error', () => {
    const error = 'Unexpected token } in JSON at position 12';
    const prompt = buildA2UIRetryPrompt(error);

    expect(typeof prompt).toBe('string');
    expect(prompt).toContain(error);
    expect(prompt).toContain(A2UI_DELIMITER);
  });

  test('includes fix instruction', () => {
    const prompt = buildA2UIRetryPrompt('missing surfaceId');
    expect(prompt).toContain('fix');
  });
});

describe('parseA2UIResponse – error cases for retry', () => {
  test('returns error field on malformed JSON after delimiter', () => {
    const raw = `Here is some text\n${A2UI_DELIMITER}\n{not: valid: json:}`;
    const result = parseA2UIResponse(raw);

    expect(result.hasA2UI).toBe(false);
    expect(result.messages).toEqual([]);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('Invalid JSON');
    expect(result.text).toBe('Here is some text');
  });

  test('returns error field on invalid schema after delimiter', () => {
    // Valid JSON but does not match the A2UI message schema (missing surfaceId)
    const invalidPayload = [
      {
        createSurface: {
          catalogId: 'chart-1',
          // surfaceId is required but missing
        },
      },
    ];
    const raw = `Chart data\n${A2UI_DELIMITER}\n${JSON.stringify(invalidPayload)}`;
    const result = parseA2UIResponse(raw);

    expect(result.hasA2UI).toBe(false);
    expect(result.messages).toEqual([]);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('A2UI validation failed');
    expect(result.text).toBe('Chart data');
  });

  test('no error when delimiter is absent', () => {
    const result = parseA2UIResponse('plain text without a2ui');
    expect(result.hasA2UI).toBe(false);
    expect(result.error).toBeUndefined();
  });
});
