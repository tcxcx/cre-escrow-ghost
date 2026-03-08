'use client';

import { useCopilotReadable } from '@copilotkit/react-core';
import { getDisabledActions } from './permission-gate';

export function useNegativeReadable(userRole: string): void {
  const disabledActions = getDisabledActions(userRole);

  useCopilotReadable({
    description: 'Actions the user does NOT have permission to perform. Never suggest or attempt these.',
    value: disabledActions.length > 0
      ? {
          deniedActions: disabledActions,
          instruction: `The user has role "${userRole}". They CANNOT perform: ${disabledActions.join(', ')}. Do not suggest these actions.`,
        }
      : {
          deniedActions: [] as string[],
          instruction: `The user has role "${userRole}" with full access.`,
        },
  });
}
