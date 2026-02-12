'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Scale, FileText, AlertTriangle, Users, CheckCircle2 } from 'lucide-react'

interface DisclaimerModalProps {
  open: boolean
  onAccept: () => void
  onCancel: () => void
}

export function DisclaimerModal({ open, onAccept, onCancel }: DisclaimerModalProps) {
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false)
  const [tosAccepted, setTosAccepted] = useState(false)
  const [legalResponsibilityAcknowledged, setLegalResponsibilityAcknowledged] = useState(false)

  const allAccepted = disclaimerAccepted && tosAccepted && legalResponsibilityAcknowledged

  const handleAccept = () => {
    if (allAccepted) {
      // In production, save to database with timestamp
      localStorage.setItem('bufi_terms_accepted', JSON.stringify({
        acceptedAt: new Date().toISOString(),
        acceptedVersion: '1.0',
        disclaimerAccepted,
        tosAccepted,
        legalResponsibilityAcknowledged,
      }))
      onAccept()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
              <Scale className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">Templates, Not Legal Advice</DialogTitle>
              <DialogDescription className="mt-1">
                Please review and accept before creating contracts
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[50vh]">
          <div className="p-6 space-y-6">
            {/* What Templates Are */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <h3 className="font-semibold text-foreground">What BUFI Templates Provide</h3>
              </div>
              <ul className="ml-7 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">+</span>
                  <span>Customizable contract templates for common business scenarios</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">+</span>
                  <span>Blockchain-secured signatures with immutable audit trails</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">+</span>
                  <span>Automated escrow and milestone-based payments in USDC</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">+</span>
                  <span>AI-powered deliverable verification against agreed criteria</span>
                </li>
              </ul>
            </div>

            {/* What Templates Are NOT */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold text-foreground">What BUFI Templates Are NOT</h3>
              </div>
              <ul className="ml-7 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">-</span>
                  <span>Legal advice or a substitute for professional legal counsel</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">-</span>
                  <span>Guaranteed to be enforceable in all jurisdictions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">-</span>
                  <span>Tailored to your specific legal or regulatory requirements</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">-</span>
                  <span>A replacement for jurisdiction-specific compliance review</span>
                </li>
              </ul>
            </div>

            {/* Recommendations */}
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Our Recommendations</h3>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>1. Have contracts reviewed by qualified legal counsel before signing</li>
                <li>2. Customize templates to fit your specific business needs</li>
                <li>3. Understand the legal implications in your jurisdiction</li>
                <li>4. Keep records of all contract communications and amendments</li>
              </ul>
              <div className="mt-4 p-3 rounded-md bg-card border border-border">
                <p className="text-sm text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="font-medium">Pro Tip:</span>
                  <span className="text-muted-foreground">Add your lawyer to your workspace or share preview links for review</span>
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Checkboxes */}
        <div className="p-6 border-t border-border space-y-4 bg-muted/30">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="disclaimer"
                checked={disclaimerAccepted}
                onCheckedChange={(checked) => setDisclaimerAccepted(checked === true)}
                className="mt-0.5"
              />
              <Label htmlFor="disclaimer" className="text-sm cursor-pointer leading-relaxed">
                I understand that BUFI provides templates, not legal advice
              </Label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="tos"
                checked={tosAccepted}
                onCheckedChange={(checked) => setTosAccepted(checked === true)}
                className="mt-0.5"
              />
              <Label htmlFor="tos" className="text-sm cursor-pointer leading-relaxed">
                I accept the{' '}
                <a href="/terms" className="text-primary hover:underline" target="_blank">
                  BUFI Contracts Terms of Service
                </a>
              </Label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="legal"
                checked={legalResponsibilityAcknowledged}
                onCheckedChange={(checked) => setLegalResponsibilityAcknowledged(checked === true)}
                className="mt-0.5"
              />
              <Label htmlFor="legal" className="text-sm cursor-pointer leading-relaxed">
                I acknowledge responsibility for reviewing contracts with appropriate legal counsel before signing
              </Label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onCancel} className="bg-transparent">
              Cancel
            </Button>
            <Button onClick={handleAccept} disabled={!allAccepted}>
              Accept & Continue
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Hook to check if terms have been accepted
export function useDisclaimerAccepted(): boolean {
  if (typeof window === 'undefined') return false
  const stored = localStorage.getItem('bufi_terms_accepted')
  return stored !== null
}
