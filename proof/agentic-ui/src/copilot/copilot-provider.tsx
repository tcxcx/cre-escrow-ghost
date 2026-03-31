'use client';

import { CopilotKit } from '@copilotkit/react-core';
import type { ReactNode } from 'react';

export interface BuCopilotProviderProps {
  teamId: string;
  userRole: string;
  tier: string;
  runtimeUrl?: string;
  onError?: (error: Error) => void;
  children: ReactNode;
}

export function BuCopilotProvider({
  teamId,
  userRole,
  tier,
  runtimeUrl = '/api/copilotkit',
  onError,
  children,
}: BuCopilotProviderProps) {
  return (
    <CopilotKit
      runtimeUrl={runtimeUrl}
      properties={{ teamId, userRole, tier }}
      onError={onError}
    >
      {children}
    </CopilotKit>
  );
}
