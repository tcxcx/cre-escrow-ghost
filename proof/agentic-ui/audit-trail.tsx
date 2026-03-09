'use client'

import { Badge } from '@bu/ui/badge'
import { Copy } from 'lucide-react'
import { cn } from '@bu/ui/cn'
import { toast } from '@bu/ui/use-toast'
import type { AuditDocument } from '@/types/arbitration'

interface AuditTrailProps {
  documents: AuditDocument[]
  className?: string
}

const layerLabel = { 1: 'L1', 2: 'L2', 3: 'L3', 4: 'L4' } as Record<number, string>

export function AuditTrail({ documents, className }: AuditTrailProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <p className="text-xs text-muted-foreground mb-3">{documents.length} documents, SHA-256 on-chain</p>
      <div className="divide-y divide-border">
        {documents.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-3 min-w-0">
              <Badge variant="outline" className="text-[10px] shrink-0">{layerLabel[doc.layer] ?? `L${doc.layer}`}</Badge>
              <span className="text-sm text-foreground truncate">{doc.title}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground font-mono">{doc.hash.slice(0, 12)}...</span>
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(doc.hash); toast({ title: 'Copied', variant: 'success-light' }) }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
