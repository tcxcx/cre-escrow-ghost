'use client';

import { useCopilotChatSuggestions } from '@copilotkit/react-core';
import type { PageContext } from './readable-sync';

function buildSuggestionInstructions(context: PageContext): string {
  const parts: string[] = [];
  parts.push(`The user is on page: ${context.currentPage}.`);
  if (context.activeEntity) {
    parts.push(
      `They have a ${context.activeEntity.type} open (ID: ${context.activeEntity.id}).`,
    );
    parts.push(`Suggest actions relevant to this ${context.activeEntity.type}.`);
  }
  if (context.activeSheet) {
    parts.push(`Active sheet: ${context.activeSheet.type}.`);
  }
  if (context.overlays.isTransferOpen) {
    parts.push('A transfer dialog is open. Suggest transfer-related actions.');
  }
  if (!context.activeEntity && !context.activeSheet) {
    parts.push(
      'No specific entity is selected. Suggest high-level financial actions.',
    );
  }
  return parts.join(' ');
}

export function useBufiSuggestions(
  context: PageContext,
  options?: { maxSuggestions?: number },
): void {
  useCopilotChatSuggestions({
    instructions: buildSuggestionInstructions(context),
    maxSuggestions: options?.maxSuggestions ?? 3,
  });
}
