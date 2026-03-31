'use client'

import { useState } from 'react'
import { Button } from '@bu/ui/button'
import { Input } from '@bu/ui/input'
import { Label } from '@bu/ui/label'
import { Textarea } from '@bu/ui/textarea'
import { Separator } from '@bu/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@bu/ui/dialog'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@bu/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@bu/ui/popover'
import {
  Mail,
  Send,
  Link2,
  Copy,
  Check,
  Search,
  Building2,
  Clock,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@bu/ui/cn'
import type { ActiveContract } from '@/types/contracts'

interface InviteCounterpartyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contract: ActiveContract
  onInvite: (method: 'email' | 'workspace' | 'link', data: { email?: string; workspaceId?: string; message?: string }) => Promise<void>
}

// Mock workspace data
const mockWorkspaces = [
  { id: '1', name: 'MOIC Digital', email: 'team@moicdigital.com' },
  { id: '2', name: 'Studio XYZ', email: 'hello@studioxyz.com' },
  { id: '3', name: 'Acme Corp', email: 'contracts@acmecorp.com' },
]

export function InviteCounterpartyModal({ open, onOpenChange, contract, onInvite }: InviteCounterpartyModalProps) {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [selectedWorkspace, setSelectedWorkspace] = useState<typeof mockWorkspaces[0] | null>(null)
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const shareLink = `https://app.bufi.finance/contracts/${contract.id}/sign?token=xyz789`

  const handleSendInvite = async () => {
    setIsSending(true)
    try {
      if (selectedWorkspace) {
        await onInvite('workspace', { workspaceId: selectedWorkspace.id, message })
      } else if (email) {
        await onInvite('email', { email, message })
      }
      onOpenChange(false)
    } finally {
      setIsSending(false)
    }
  }

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareLink)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Invite Counterparty
          </DialogTitle>
          <DialogDescription>
            Send this contract to the other party for review and signature
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Main Invite Section */}
          <div className="p-4 rounded-lg border border-border bg-card">
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <Send className="h-4 w-4 text-muted-foreground" />
              Send Contract to Counterparty
            </h4>

            {/* Workspace Search */}
            <div className="space-y-2 mb-4">
              <Label className="text-sm">Recipient Workspace</Label>
              <Popover open={workspaceOpen} onOpenChange={setWorkspaceOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={workspaceOpen}
                    className="w-full justify-between font-normal bg-transparent"
                  >
                    {selectedWorkspace ? (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {selectedWorkspace.name}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Search className="h-4 w-4" />
                        Search workspaces...
                      </div>
                    )}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Search workspaces..." />
                    <CommandList>
                      <CommandEmpty>No workspace found.</CommandEmpty>
                      <CommandGroup>
                        {mockWorkspaces.map((workspace) => (
                          <CommandItem
                            key={workspace.id}
                            value={workspace.name}
                            onSelect={() => {
                              setSelectedWorkspace(workspace)
                              setEmail('')
                              setWorkspaceOpen(false)
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                                <Building2 className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{workspace.name}</p>
                                <p className="text-xs text-muted-foreground">{workspace.email}</p>
                              </div>
                            </div>
                            {selectedWorkspace?.id === workspace.id && (
                              <Check className="ml-auto h-4 w-4" />
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or invite by email</span>
              </div>
            </div>

            {/* Email Input */}
            <div className="space-y-2 mb-4">
              <Label htmlFor="email" className="text-sm">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="contractor@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setSelectedWorkspace(null)
                }}
              />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message" className="text-sm">Personal message (optional)</Label>
              <Textarea
                id="message"
                placeholder="Hey team, here's the contract for our project. Let me know if you have any questions!"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Share Link Section */}
          <div className="p-4 rounded-lg border border-dashed border-border bg-muted/30">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              Or share link directly
            </h4>
            <div className="flex gap-2">
              <Input
                value={shareLink}
                readOnly
                className="font-mono text-xs bg-background"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
                className="shrink-0 bg-transparent"
              >
                {linkCopied ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
              <AlertTriangle className="h-3 w-3" />
              <span>Link expires in 14 days</span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="sm:mr-auto">
            Cancel
          </Button>
          <Button
            onClick={handleSendInvite}
            disabled={(!email && !selectedWorkspace) || isSending}
            className="gap-2"
          >
            {isSending ? (
              <>Sending...</>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Contract Invite
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
