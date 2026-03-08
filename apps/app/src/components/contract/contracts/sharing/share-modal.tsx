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
import { Textarea } from '@bu/ui/textarea'
import { Checkbox } from '@bu/ui/checkbox'
import { Badge } from '@bu/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@bu/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@bu/ui/select'
import {
  Mail,
  Link2,
  Copy,
  Check,
  Eye,
  MessageSquare,
  Lightbulb,
  Shield,
  Clock,
  Loader2,
  Users,
} from 'lucide-react'
import { cn } from '@bu/ui/cn'

interface ShareModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contractId: string
  contractName: string
}

export function ShareModal({ open, onOpenChange, contractId, contractName }: ShareModalProps) {
  const [activeTab, setActiveTab] = useState('email')
  
  // Email invite state
  const [emails, setEmails] = useState('')
  const [message, setMessage] = useState('')
  const [canComment, setCanComment] = useState(true)
  const [canSuggest, setCanSuggest] = useState(true)
  const [canApprove, setCanApprove] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [sentSuccess, setSentSuccess] = useState(false)

  // Link state
  const [linkExpiration, setLinkExpiration] = useState('7')
  const [linkPassword, setLinkPassword] = useState('')
  const [linkCanComment, setLinkCanComment] = useState(true)
  const [linkCanSuggest, setLinkCanSuggest] = useState(false)
  const [linkCanApprove, setLinkCanApprove] = useState(false)
  const [generatedLink, setGeneratedLink] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const handleSendInvite = async () => {
    if (!emails.trim()) return
    
    setIsSending(true)
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1500))
    setIsSending(false)
    setSentSuccess(true)
    
    // Reset after success
    setTimeout(() => {
      setSentSuccess(false)
      setEmails('')
      setMessage('')
    }, 2000)
  }

  const handleGenerateLink = async () => {
    setIsGenerating(true)
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1000))
    
    const token = Math.random().toString(36).substring(2, 15)
    const link = `${window.location.origin}/review/${contractId}/${token}`
    setGeneratedLink(link)
    setIsGenerating(false)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Share for Review
          </DialogTitle>
          <DialogDescription>
            Invite others to review "{contractName}"
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email" className="gap-2">
              <Mail className="w-4 h-4" />
              Email Invite
            </TabsTrigger>
            <TabsTrigger value="link" className="gap-2">
              <Link2 className="w-4 h-4" />
              Shareable Link
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="emails">Email addresses</Label>
              <Input
                id="emails"
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                placeholder="lawyer@firm.com, partner@company.com"
              />
              <p className="text-xs text-muted-foreground">Separate multiple emails with commas</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message (optional)</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Please review this contract before we proceed..."
                className="min-h-[80px] resize-none"
              />
            </div>

            <div className="space-y-3">
              <Label>Permissions</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="view"
                    checked={true}
                    disabled
                  />
                  <Label htmlFor="view" className="flex items-center gap-2 text-sm cursor-default">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    View contract
                    <Badge variant="secondary" className="text-xs">Always</Badge>
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="comment"
                    checked={canComment}
                    onCheckedChange={(c) => setCanComment(c === true)}
                  />
                  <Label htmlFor="comment" className="flex items-center gap-2 text-sm cursor-pointer">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    Add comments
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="suggest"
                    checked={canSuggest}
                    onCheckedChange={(c) => setCanSuggest(c === true)}
                  />
                  <Label htmlFor="suggest" className="flex items-center gap-2 text-sm cursor-pointer">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    Suggest edits
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="approve"
                    checked={canApprove}
                    onCheckedChange={(c) => setCanApprove(c === true)}
                  />
                  <Label htmlFor="approve" className="flex items-center gap-2 text-sm cursor-pointer">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    Approve for signing
                  </Label>
                </div>
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={handleSendInvite}
              disabled={!emails.trim() || isSending || sentSuccess}
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : sentSuccess ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Invites Sent!
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Invite
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="link" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Link expiration</Label>
              <Select value={linkExpiration} onValueChange={setLinkExpiration}>
                <SelectTrigger>
                  <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="never">Never expires</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password protection (optional)</Label>
              <Input
                id="password"
                type="password"
                value={linkPassword}
                onChange={(e) => setLinkPassword(e.target.value)}
                placeholder="Enter password..."
              />
            </div>

            <div className="space-y-3">
              <Label>Permissions</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="link-view"
                    checked={true}
                    disabled
                  />
                  <Label htmlFor="link-view" className="flex items-center gap-2 text-sm cursor-default">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    View contract
                    <Badge variant="secondary" className="text-xs">Always</Badge>
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="link-comment"
                    checked={linkCanComment}
                    onCheckedChange={(c) => setLinkCanComment(c === true)}
                  />
                  <Label htmlFor="link-comment" className="flex items-center gap-2 text-sm cursor-pointer">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    Add comments
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="link-suggest"
                    checked={linkCanSuggest}
                    onCheckedChange={(c) => setLinkCanSuggest(c === true)}
                  />
                  <Label htmlFor="link-suggest" className="flex items-center gap-2 text-sm cursor-pointer">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    Suggest edits
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="link-approve"
                    checked={linkCanApprove}
                    onCheckedChange={(c) => setLinkCanApprove(c === true)}
                  />
                  <Label htmlFor="link-approve" className="flex items-center gap-2 text-sm cursor-pointer">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    Approve for signing
                  </Label>
                </div>
              </div>
            </div>

            {generatedLink ? (
              <div className="space-y-2">
                <Label>Your link</Label>
                <div className="flex gap-2">
                  <Input
                    value={generatedLink}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button variant="outline" size="icon" onClick={handleCopyLink} className="bg-transparent">
                    {linkCopied ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {linkExpiration === 'never' 
                    ? 'This link never expires'
                    : `This link expires in ${linkExpiration} days`}
                  {linkPassword && ' and is password protected'}
                </p>
              </div>
            ) : (
              <Button 
                className="w-full" 
                onClick={handleGenerateLink}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4 mr-2" />
                    Generate Link
                  </>
                )}
              </Button>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
