'use client'

import React, { useState, useEffect } from 'react'
import { Shield, Hash, FileText, ExternalLink, Clock, Layers, ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '@bu/ui/badge'
import { ScrollArea } from '@bu/ui/scroll-area'
import { getAgreementArtifacts } from '@/lib/api/client'

interface ArtifactEntry {
  id: string
  dispute_id: string
  layer: number
  doc_type: string
  model_provider?: string
  model_id?: string
  sha256: string
  storage_ref: string
  created_at: string
}

const LAYER_LABELS: Record<number, string> = {
  1: 'Layer 1 — Verifier',
  2: 'Layer 2 — Advocates',
  3: 'Layer 3 — Tribunal',
  4: 'Layer 4 — Supreme Court',
}

const LAYER_COLORS: Record<number, string> = {
  1: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  2: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  3: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  4: 'bg-red-500/10 text-red-600 border-red-500/20',
}

interface AuditTrailViewerProps {
  agreementId: string
}

export function AuditTrailViewer({ agreementId }: AuditTrailViewerProps) {
  const [artifacts, setArtifacts] = useState<ArtifactEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      try {
        const { artifacts: data } = await getAgreementArtifacts(agreementId)
        setArtifacts(data as ArtifactEntry[])
      } catch {
        // Artifacts may not exist yet
        setArtifacts([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [agreementId])

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading audit trail...
      </div>
    )
  }

  if (artifacts.length === 0) {
    return (
      <div className="p-6 text-center">
        <Shield className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No artifacts yet. They will appear after verification or dispute.</p>
      </div>
    )
  }

  // Group by layer
  const byLayer = artifacts.reduce<Record<number, ArtifactEntry[]>>((acc, a) => {
    acc[a.layer] = acc[a.layer] || []
    acc[a.layer].push(a)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Audit Trail</h3>
        <Badge variant="outline">{artifacts.length} artifacts</Badge>
      </div>

      <ScrollArea className="max-h-[500px]">
        <div className="space-y-4">
          {Object.entries(byLayer)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([layer, docs]) => (
              <div key={layer} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {LAYER_LABELS[Number(layer)] || `Layer ${layer}`}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {docs.length} doc{docs.length !== 1 ? 's' : ''}
                  </Badge>
                </div>

                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="rounded-lg border border-border overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleExpand(doc.id)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.doc_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.model_provider && `${doc.model_provider}/${doc.model_id}`}
                        </p>
                      </div>
                      <Badge className={LAYER_COLORS[doc.layer] || ''} variant="outline">
                        L{doc.layer}
                      </Badge>
                      {expanded.has(doc.id) ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>

                    {expanded.has(doc.id) && (
                      <div className="px-3 pb-3 border-t border-border bg-muted/30 space-y-2 pt-3">
                        <div className="flex items-center gap-2 text-xs">
                          <Hash className="w-3 h-3 text-muted-foreground" />
                          <span className="text-muted-foreground">SHA-256:</span>
                          <code className="text-xs font-mono bg-background px-1.5 py-0.5 rounded">
                            {doc.sha256.slice(0, 16)}...{doc.sha256.slice(-8)}
                          </code>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <ExternalLink className="w-3 h-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Storage:</span>
                          <code className="text-xs font-mono bg-background px-1.5 py-0.5 rounded truncate max-w-[300px]">
                            {doc.storage_ref}
                          </code>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Created:</span>
                          <span>{new Date(doc.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
        </div>
      </ScrollArea>
    </div>
  )
}
