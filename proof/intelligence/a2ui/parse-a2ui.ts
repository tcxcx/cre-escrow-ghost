import { z } from 'zod';

const A2UI_DELIMITER = '---a2ui_JSON---';

const componentDefSchema = z.object({
  id: z.string(),
  component: z.string(),
}).passthrough();

const createSurfaceSchema = z.object({
  createSurface: z.object({
    surfaceId: z.string(),
    catalogId: z.string(),
  }),
});

const updateComponentsSchema = z.object({
  updateComponents: z.object({
    surfaceId: z.string(),
    components: z.array(componentDefSchema),
  }),
});

const updateDataModelSchema = z.object({
  updateDataModel: z.object({
    surfaceId: z.string(),
    path: z.string().optional(),
    value: z.unknown().optional(),
  }),
});

const deleteSurfaceSchema = z.object({
  deleteSurface: z.object({
    surfaceId: z.string(),
  }),
});

const a2uiMessageSchema = z.union([
  createSurfaceSchema,
  updateComponentsSchema,
  updateDataModelSchema,
  deleteSurfaceSchema,
]);

const a2uiMessagesSchema = z.array(a2uiMessageSchema);

export interface ParseA2UIResult {
  text: string;
  messages: z.infer<typeof a2uiMessagesSchema>;
  hasA2UI: boolean;
  error?: string;
}

export function parseA2UIResponse(raw: string): ParseA2UIResult {
  const delimiterIndex = raw.indexOf(A2UI_DELIMITER);

  if (delimiterIndex === -1) {
    return { text: raw, messages: [], hasA2UI: false };
  }

  const text = raw.slice(0, delimiterIndex).trim();
  const jsonPart = raw.slice(delimiterIndex + A2UI_DELIMITER.length).trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonPart);
  } catch (e) {
    return {
      text,
      messages: [],
      hasA2UI: false,
      error: `Invalid JSON after ${A2UI_DELIMITER}: ${(e as Error).message}`,
    };
  }

  const result = a2uiMessagesSchema.safeParse(parsed);
  if (!result.success) {
    return {
      text,
      messages: [],
      hasA2UI: false,
      error: `A2UI validation failed: ${result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
    };
  }

  return { text, messages: result.data, hasA2UI: true };
}

export function buildA2UIRetryPrompt(error: string): string {
  return `Your A2UI JSON was invalid: ${error}. Please fix the JSON and try again. Emit valid A2UI after the ${A2UI_DELIMITER} delimiter.`;
}

export { A2UI_DELIMITER, a2uiMessagesSchema };
