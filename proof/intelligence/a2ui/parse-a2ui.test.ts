import { describe, test, expect } from 'bun:test';
import { parseA2UIResponse, buildA2UIRetryPrompt, A2UI_DELIMITER } from './parse-a2ui';

describe('parseA2UIResponse', () => {
  test('returns plain text when no delimiter is present', () => {
    const raw = 'Here is some plain text without any A2UI.';
    const result = parseA2UIResponse(raw);

    expect(result.text).toBe(raw);
    expect(result.messages).toEqual([]);
    expect(result.hasA2UI).toBe(false);
    expect(result.error).toBeUndefined();
  });

  test('parses valid createSurface + updateComponents', () => {
    const messages = [
      {
        createSurface: {
          surfaceId: 'surface-1',
          catalogId: 'revenue-chart',
        },
      },
      {
        updateComponents: {
          surfaceId: 'surface-1',
          components: [
            { id: 'comp-1', component: 'Text', content: 'Revenue: $45,000' },
            { id: 'comp-2', component: 'Card', title: 'Q4 Summary' },
          ],
        },
      },
    ];

    const raw = `Here is the revenue data.\n${A2UI_DELIMITER}\n${JSON.stringify(messages)}`;
    const result = parseA2UIResponse(raw);

    expect(result.text).toBe('Here is the revenue data.');
    expect(result.hasA2UI).toBe(true);
    expect(result.messages).toHaveLength(2);
    expect(result.error).toBeUndefined();
  });

  test('returns error for invalid JSON', () => {
    const raw = `Some text\n${A2UI_DELIMITER}\n{not valid json}`;
    const result = parseA2UIResponse(raw);

    expect(result.text).toBe('Some text');
    expect(result.hasA2UI).toBe(false);
    expect(result.messages).toEqual([]);
    expect(result.error).toContain('Invalid JSON after');
  });

  test('returns error for schema violation (missing surfaceId)', () => {
    const messages = [
      {
        createSurface: {
          catalogId: 'revenue-chart',
          // missing surfaceId
        },
      },
    ];

    const raw = `Text\n${A2UI_DELIMITER}\n${JSON.stringify(messages)}`;
    const result = parseA2UIResponse(raw);

    expect(result.hasA2UI).toBe(false);
    expect(result.messages).toEqual([]);
    expect(result.error).toContain('A2UI validation failed');
  });

  test('handles updateDataModel messages', () => {
    const messages = [
      {
        updateDataModel: {
          surfaceId: 'surface-1',
          path: 'metrics.revenue',
          value: 62000,
        },
      },
    ];

    const raw = `Updating data model.\n${A2UI_DELIMITER}\n${JSON.stringify(messages)}`;
    const result = parseA2UIResponse(raw);

    expect(result.hasA2UI).toBe(true);
    expect(result.messages).toHaveLength(1);
    expect(result.error).toBeUndefined();
  });

  test('handles deleteSurface messages', () => {
    const messages = [
      {
        deleteSurface: {
          surfaceId: 'surface-1',
        },
      },
    ];

    const raw = `Removing surface.\n${A2UI_DELIMITER}\n${JSON.stringify(messages)}`;
    const result = parseA2UIResponse(raw);

    expect(result.hasA2UI).toBe(true);
    expect(result.messages).toHaveLength(1);
    expect(result.error).toBeUndefined();
  });
});

describe('buildA2UIRetryPrompt', () => {
  test('includes the error message and delimiter name', () => {
    const prompt = buildA2UIRetryPrompt('missing surfaceId');

    expect(prompt).toContain('missing surfaceId');
    expect(prompt).toContain(A2UI_DELIMITER);
  });
});
