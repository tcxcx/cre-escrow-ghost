'use client'

import { useState } from 'react'
import { Button } from '@bu/ui/button'
import { Checkbox } from '@bu/ui/checkbox'
import { Label } from '@bu/ui/label'
import { RadioGroup, RadioGroupItem } from '@bu/ui/radio-group'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@bu/ui/dialog'
import {
  FileText,
  Download,
  Loader2,
  CheckCircle2,
  FileJson,
} from 'lucide-react'
import type { ActiveContract } from '@/types/contracts'

interface PDFDownloadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contract: ActiveContract
}

export function PDFDownloadModal({ open, onOpenChange, contract }: PDFDownloadModalProps) {
  const [format, setFormat] = useState<'pdf' | 'json'>('pdf')
  const [options, setOptions] = useState({
    signatureCertificates: true,
    blockchainProof: true,
    milestoneDetails: true,
    activityLog: false,
    aiReports: false,
  })
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    setIsDownloading(true)
    // Simulate download
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsDownloading(false)
    onOpenChange(false)
  }

  const isSigned = contract.signatures.payer && contract.signatures.payee

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Download Contract
          </DialogTitle>
          <DialogDescription>
            Export your contract document with verification proof
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Contract Info */}
          <div className="p-4 rounded-lg border border-border bg-muted/30">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{contract.name}</p>
                <p className="text-sm text-muted-foreground">
                  Contract #{contract.id.slice(0, 8).toUpperCase()}
                </p>
                {isSigned && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-emerald-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Signed by both parties
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Select format</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as 'pdf' | 'json')}>
              <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer">
                <RadioGroupItem value="pdf" id="pdf" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="pdf" className="font-medium cursor-pointer">
                    PDF Document
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Full contract with signatures and blockchain proof
                  </p>
                </div>
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer">
                <RadioGroupItem value="json" id="json" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="json" className="font-medium cursor-pointer">
                    JSON (Machine Readable)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Structured data for integrations
                  </p>
                </div>
                <FileJson className="h-5 w-5 text-muted-foreground" />
              </div>
            </RadioGroup>
          </div>

          {/* Include Options */}
          {format === 'pdf' && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Include</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="signatures" 
                    checked={options.signatureCertificates}
                    onCheckedChange={(c) => setOptions({...options, signatureCertificates: !!c})}
                  />
                  <Label htmlFor="signatures" className="text-sm cursor-pointer">
                    Signature certificates
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="blockchain" 
                    checked={options.blockchainProof}
                    onCheckedChange={(c) => setOptions({...options, blockchainProof: !!c})}
                  />
                  <Label htmlFor="blockchain" className="text-sm cursor-pointer">
                    Blockchain verification proof
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="milestones" 
                    checked={options.milestoneDetails}
                    onCheckedChange={(c) => setOptions({...options, milestoneDetails: !!c})}
                  />
                  <Label htmlFor="milestones" className="text-sm cursor-pointer">
                    Milestone details
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="activity" 
                    checked={options.activityLog}
                    onCheckedChange={(c) => setOptions({...options, activityLog: !!c})}
                  />
                  <Label htmlFor="activity" className="text-sm cursor-pointer">
                    Activity log
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="ai" 
                    checked={options.aiReports}
                    onCheckedChange={(c) => setOptions({...options, aiReports: !!c})}
                  />
                  <Label htmlFor="ai" className="text-sm cursor-pointer">
                    AI verification reports
                  </Label>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleDownload} disabled={isDownloading} className="gap-2">
            {isDownloading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download {format.toUpperCase()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
