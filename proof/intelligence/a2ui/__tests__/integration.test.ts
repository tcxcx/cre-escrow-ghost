import { describe, test, expect } from 'bun:test';
import { parseA2UIResponse, buildA2UIRetryPrompt, A2UI_DELIMITER } from '../parse-a2ui';

describe('A2UI integration', () => {
  test('buildA2UIEmissionPrompt produces non-empty string with delimiter', async () => {
    const { buildA2UIEmissionPrompt } = await import('../../prompts/a2ui-emission');
    // Use a realistic catalog schema JSON (avoid importing @bu/agentic-ui which
    // pulls in React components that cannot load in bun test)
    const catalogSchemaJSON = JSON.stringify({
      version: '0.9',
      components: {
        Text: { props: { text: 'string (required)', variant: 'h1|body' } },
        MetricCard: { props: { label: 'string (required)', value: 'string (required)', trend: 'string', confidence: 'high|medium|low' } },
      },
      messageTypes: {
        createSurface: { surfaceId: 'unique string', catalogId: 'bu-catalog' },
        updateComponents: { surfaceId: 'string', components: 'ComponentDefinition[]' },
      },
    });
    const prompt = buildA2UIEmissionPrompt(catalogSchemaJSON);
    expect(prompt).toContain(A2UI_DELIMITER);
    expect(prompt).toContain('Generative UI');
    expect(prompt).toContain('createSurface');
    expect(prompt.length).toBeGreaterThan(500);
  });

  test('full pipeline: prompt -> simulated LLM output -> parse -> valid A2UI', () => {
    // Simulate what the LLM would produce after reading the prompt
    const llmOutput = `Your burn rate is $41,200/month, down 8% from last month.

${A2UI_DELIMITER}
[
  { "createSurface": { "surfaceId": "burn-dash", "catalogId": "bu-catalog" } },
  { "updateComponents": { "surfaceId": "burn-dash", "components": [
    { "id": "card", "component": "Card", "child": "content" },
    { "id": "content", "component": "Column", "children": ["metric", "trend"] },
    { "id": "metric", "component": "MetricCard", "label": "Burn Rate", "value": "$41,200/mo", "trend": "-8%", "confidence": "high" },
    { "id": "trend", "component": "Text", "text": "Trending down — runway extended to 14.2 months", "variant": "caption" }
  ] } }
]`;

    const result = parseA2UIResponse(llmOutput);
    expect(result.hasA2UI).toBe(true);
    expect(result.text).toContain('burn rate');
    expect(result.text).not.toContain(A2UI_DELIMITER);
    expect(result.messages).toHaveLength(2);
    // First message is createSurface
    expect('createSurface' in result.messages![0]!).toBe(true);
    // Second message is updateComponents with 4 components
    expect('updateComponents' in result.messages![1]!).toBe(true);
    const update = result.messages![1] as { updateComponents: { components: unknown[] } };
    expect(update.updateComponents.components).toHaveLength(4);
  });

  test('retry pipeline: invalid -> error -> retry prompt -> valid', () => {
    // First attempt: malformed JSON (missing surfaceId in createSurface)
    const badOutput = `Here are results.\n\n${A2UI_DELIMITER}\n[{ "createSurface": { "catalogId": "bu-catalog" } }]`;
    const firstResult = parseA2UIResponse(badOutput);
    expect(firstResult.hasA2UI).toBe(false);
    expect(firstResult.error).toBeDefined();

    // Build retry prompt
    const retryPrompt = buildA2UIRetryPrompt(firstResult.error!);
    expect(retryPrompt).toContain(firstResult.error!);
    expect(retryPrompt).toContain(A2UI_DELIMITER);

    // Second attempt: fixed JSON
    const goodOutput = `Here are results.\n\n${A2UI_DELIMITER}\n[{ "createSurface": { "surfaceId": "s1", "catalogId": "bu-catalog" } }]`;
    const secondResult = parseA2UIResponse(goodOutput);
    expect(secondResult.hasA2UI).toBe(true);
  });

  test('fallback: completely malformed response -> text-only', () => {
    const garbledOutput = `Good morning!\n\n${A2UI_DELIMITER}\nthis is not json at all {{{`;
    const result = parseA2UIResponse(garbledOutput);
    expect(result.hasA2UI).toBe(false);
    expect(result.text).toBe('Good morning!');
    expect(result.error).toContain('Invalid JSON');
    expect(result.messages).toEqual([]);
  });

  test('no delimiter -> plain text passthrough', () => {
    const plainResponse = 'Your burn rate is $41,200/month. That is a 8% decrease from last month.';
    const result = parseA2UIResponse(plainResponse);
    expect(result.hasA2UI).toBe(false);
    expect(result.text).toBe(plainResponse);
    expect(result.messages).toEqual([]);
    expect(result.error).toBeUndefined();
  });
});
