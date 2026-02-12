export type CommentType = 'comment' | 'suggestion' | 'question'
export type CommentStatus = 'open' | 'resolved' | 'accepted' | 'rejected'
export type AuthorRole = 'owner' | 'admin' | 'legal_reviewer' | 'counterparty' | 'viewer'

export interface ContractComment {
  id: string
  contractId: string
  
  // Location in document
  sectionId: string
  startOffset?: number
  endOffset?: number
  highlightedText?: string
  
  // Content
  type: CommentType
  content: string
  suggestedText?: string // For suggestions only
  
  // Author
  authorId: string
  authorName: string
  authorEmail?: string
  authorAvatar?: string
  authorRole: AuthorRole
  
  // Status
  status: CommentStatus
  resolvedBy?: string
  resolvedAt?: string
  
  // Threading
  parentCommentId?: string
  replies?: ContractComment[]
  
  createdAt: string
  updatedAt: string
}

export interface ReviewLink {
  id: string
  contractId: string
  token: string
  expiresAt: string
  password?: string
  permissions: {
    canComment: boolean
    canSuggest: boolean
    canApprove: boolean
  }
  createdBy: string
  createdAt: string
  viewCount: number
  lastViewedAt?: string
}

export interface ContractReviewer {
  id: string
  contractId: string
  userId?: string
  email: string
  name: string
  role: 'legal_reviewer' | 'viewer' | 'counterparty'
  canComment: boolean
  canSuggest: boolean
  canApprove: boolean
  invitedAt: string
  invitedBy: string
  lastViewedAt?: string
  approvalStatus?: 'pending' | 'approved' | 'changes_requested'
  approvedAt?: string
  approvalNotes?: string
}

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'legal_reviewer' | 'viewer'
