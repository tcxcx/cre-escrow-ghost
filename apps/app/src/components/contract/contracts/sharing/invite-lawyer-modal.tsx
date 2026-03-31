'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@bu/ui/dialog'
import { Button } from '@bu/ui/button'
import { Input } from '@bu/ui/input'
import { Label } from '@bu/ui/label'
import { Badge } from '@bu/ui/badge'
import {
  Scale,
  Mail,
  Check,
  Loader2,
  Eye,
  MessageSquare,
  Lightbulb,
  Shield,
} from 'lucide-react'

interface InviteLawyerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceName?: string
}

export function InviteLawyerModal({ open, onOpenChange, workspaceName = 'your workspace' }: InviteLawyerModalProps) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sentSuccess, setSentSuccess] = useState(false)

  const handleInvite = async () => {
    if (!email.trim()) return
    
    setIsSending(true)
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1500))
    setIsSending(false)
    setSentSuccess(true)
    
    setTimeout(() => {
      onOpenChange(false)
      setSentSuccess(false)
      setEmail('')
      setName('')
    }, 1500)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10">
              <Scale className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <DialogTitle>Add Legal Reviewer</DialogTitle>
              <DialogDescription className="mt-0.5">
                Invite your lawyer to {workspaceName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="lawyer-name">Name</Label>
            <Input
              id="lawyer-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lawyer-email">Email address</Label>
            <Input
              id="lawyer-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="lawyer@lawfirm.com"
            />
          </div>

          {/* Permissions Info */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Legal Reviewer
              </Badge>
              <span className="text-xs text-muted-foreground">Role permissions</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-foreground">
                <Eye className="w-4 h-4 text-muted-foreground" />
                View all contract drafts and previews
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <MessageSquare className="w-4 h-4 text-blue-500" />
                Add comments on any contract
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                Suggest changes and edits
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <Shield className="w-4 h-4 text-emerald-500" />
                Approve contracts for signing
              </div>
            </div>
            <div className="pt-2 border-t border-border text-xs text-muted-foreground">
              Legal reviewers cannot sign contracts, approve payments, or modify workspace settings.
            </div>
          </div>

          <Button 
            className="w-full" 
            onClick={handleInvite}
            disabled={!email.trim() || isSending || sentSuccess}
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending Invite...
              </>
            ) : sentSuccess ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Invite Sent!
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Send Invite
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
