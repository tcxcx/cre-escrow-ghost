'use client';

import { useCopilotReadable } from '@copilotkit/react-core';

export interface PageContext {
  currentPage: string;
  activeSheet: { type: string; id?: string; subtype?: string } | null;
  activeEntity: { type: string; id: string } | null;
  overlays: Record<string, boolean>;
  /** Brief summary of the user's last main chat interaction (read-only bridge from AiModal) */
  chatSummary?: string | null;
}

export function useBufiContextReadable(context: PageContext): void {
  useCopilotReadable({
    description: 'Current page and UI state the user is viewing in the Bu app',
    value: context,
  });
}
