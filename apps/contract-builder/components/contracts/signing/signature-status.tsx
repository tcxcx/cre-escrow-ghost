'use client'

import { Check, Clock, Loader2, Building2, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Party, Signature } from '@/types/contracts'
import { formatDistanceToNow } from 'date-fns'

interface SignatureStatusProps {
  party: Party
  signature?: Signature
  isCurrentUser: boolean
}

export function SignatureStatus({ party, signature, isCurrentUser }: SignatureStatusProps) {
  const isSigned = signature?.signed
  
  return (
    <div
      className={cn(
        'relative p-4 rounded-xl border-2 transition-all',
        isSigned
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : 'border-border bg-card'
      )}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div
          className={cn(
            'flex items-center justify-center w-12 h-12 rounded-xl',
            party.role === 'payer' ? 'bg-blue-500/10' : 'bg-purple-500/10'
          )}
        >
          {party.role === 'payer' ? (
            <Building2 className={cn('w-6 h-6', party.role === 'payer' ? 'text-blue-500' : 'text-purple-500')} />
          ) : (
            <User className="w-6 h-6 text-purple-500" />
          )}
        </div>

        {/* Party Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">{party.name}</span>
            {isCurrentUser && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">You</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{party.bufiHandle}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Role: <span className="capitalize">{party.role}</span>
          </p>
        </div>

        {/* Status */}
        <div className="flex flex-col items-end gap-1">
          {isSigned ? (
            <>
              <div className="flex items-center gap-1.5 text-emerald-500">
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">SIGNED</span>
              </div>
              {signature?.signedAt && (
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(signature.signedAt, { addSuffix: true })}
                </p>
              )}
            </>
          ) : isCurrentUser ? (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="text-sm">NOT SIGNED</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-amber-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">AWAITING...</span>
            </div>
          )}
        </div>
      </div>

      {/* Transaction info if signed */}
      {isSigned && signature?.txHash && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">TX: {signature.txHash.slice(0, 10)}...{signature.txHash.slice(-8)}</span>
            <a
              href={`https://snowtrace.io/tx/${signature.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              View on Explorer
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

interface SignatureStatusListProps {
  payer: Party
  payee: Party
  payerSignature?: Signature
  payeeSignature?: Signature
  currentUserRole: 'payer' | 'payee' | null
}

export function SignatureStatusList({
  payer,
  payee,
  payerSignature,
  payeeSignature,
  currentUserRole,
}: SignatureStatusListProps) {
  return (
    <div className="space-y-3">
      <SignatureStatus
        party={payer}
        signature={payerSignature}
        isCurrentUser={currentUserRole === 'payer'}
      />
      <div className="flex justify-center">
        <div className="w-0.5 h-4 bg-border" />
      </div>
      <SignatureStatus
        party={payee}
        signature={payeeSignature}
        isCurrentUser={currentUserRole === 'payee'}
      />
    </div>
  )
}
