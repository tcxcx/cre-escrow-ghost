'use client';

import { useState, useEffect } from 'react';
import { useCopilotAction } from '@copilotkit/react-core';

function useCountdown(seconds: number) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [remaining]);

  const minutes = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const display = `${minutes}:${secs.toString().padStart(2, '0')}`;
  const isExpired = remaining <= 0;
  const isUrgent = remaining <= 60;

  return { display, isExpired, isUrgent };
}

function TransferApprovalUI({ args, respond, status }: { args: any; respond: any; status: string }) {
  const { display, isExpired, isUrgent } = useCountdown(10 * 60);

  if (status === 'inProgress') {
    return <div className="animate-pulse text-sm text-muted-foreground">Preparing approval...</div>;
  }

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-base font-semibold">Transfer Approval</div>
        <div className={`text-xs font-mono ${isExpired ? 'text-red-600' : isUrgent ? 'text-yellow-600' : 'text-muted-foreground'}`}>
          {isExpired ? 'Expired' : display}
        </div>
      </div>
      <div className="mt-1 text-sm text-muted-foreground">
        {args.amount} {args.currency} &rarr; {args.recipient}
        {args.description ? ` — ${args.description}` : ''}
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => respond?.({ approved: true })}
          disabled={isExpired}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => respond?.({ approved: false })}
          className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
        >
          Reject
        </button>
      </div>
      {isExpired && (
        <div className="mt-2 text-xs text-red-600">
          This approval has expired. Please request a new one.
        </div>
      )}
    </div>
  );
}

function GatewayApprovalUI({ args, respond, status }: { args: any; respond: any; status: string }) {
  const { display, isExpired, isUrgent } = useCountdown(5 * 60);

  if (status === 'inProgress') {
    return <div className="animate-pulse text-sm text-muted-foreground">Preparing approval...</div>;
  }

  const riskColorClass =
    args.risk === 'high'
      ? 'text-red-600'
      : args.risk === 'medium'
        ? 'text-yellow-600'
        : 'text-green-600';

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-base font-semibold">
          {args.app}: {args.action}
        </div>
        <div className={`text-xs font-mono ${isExpired ? 'text-red-600' : isUrgent ? 'text-yellow-600' : 'text-muted-foreground'}`}>
          {isExpired ? 'Expired' : display}
        </div>
      </div>
      {args.details && (
        <div className="mt-1 text-sm text-muted-foreground">
          {args.details}
        </div>
      )}
      <div className="mt-1 text-xs">
        Risk: <span className={riskColorClass}>{args.risk}</span>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => respond?.({ approved: true })}
          disabled={isExpired}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => respond?.({ approved: false })}
          className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
        >
          Reject
        </button>
      </div>
      {isExpired && (
        <div className="mt-2 text-xs text-red-600">
          This approval has expired. Please request a new one.
        </div>
      )}
    </div>
  );
}

export interface HITLConfig {
  teamId: string;
  userRole: string;
}

export function useBufiHITLActions(config: HITLConfig) {
  // Register transfer approval action
  useCopilotAction({
    name: 'requestTransferApproval',
    description: 'Request user approval for a financial transfer',
    parameters: [
      {
        name: 'amount',
        type: 'string',
        description: 'Transfer amount',
        required: true,
      },
      {
        name: 'currency',
        type: 'string',
        description: 'Currency code',
        required: true,
      },
      {
        name: 'recipient',
        type: 'string',
        description: 'Recipient name or address',
        required: true,
      },
      {
        name: 'description',
        type: 'string',
        description: 'Transfer description',
      },
    ],
    renderAndWaitForResponse: (props) => <TransferApprovalUI {...props} />,
  });

  // Register gateway approval action
  useCopilotAction({
    name: 'requestGatewayApproval',
    description: 'Request user approval for an external integration action',
    parameters: [
      {
        name: 'app',
        type: 'string',
        description: 'Integration app name',
        required: true,
      },
      {
        name: 'action',
        type: 'string',
        description: 'Action to perform',
        required: true,
      },
      {
        name: 'risk',
        type: 'string',
        description: 'Risk level: low/medium/high',
        required: true,
      },
      {
        name: 'details',
        type: 'string',
        description: 'Action details',
      },
    ],
    renderAndWaitForResponse: (props) => <GatewayApprovalUI {...props} />,
  });
}
