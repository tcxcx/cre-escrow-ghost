'use client'

import React from "react"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DollarSign,
  CheckCircle2,
  FileText,
  Upload,
  TrendingUp,
  PenLine,
  Wallet,
  ExternalLink,
  Filter,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type ActivityType = 
  | 'payment_released'
  | 'milestone_verified'
  | 'milestone_submitted'
  | 'yield_accrued'
  | 'escrow_funded'
  | 'contract_deployed'
  | 'contract_signed'
  | 'dispute_opened'
  | 'dispute_resolved'

interface ActivityItem {
  id: string
  type: ActivityType
  title: string
  description: string
  timestamp: string
  txHash?: string
  metadata?: Record<string, unknown>
}

interface ActivityFeedProps {
  activities: ActivityItem[]
  onLoadMore?: () => void
  isLoading?: boolean
  hasMore?: boolean
}

const activityIcons: Record<ActivityType, { icon: React.ElementType; color: string }> = {
  payment_released: { icon: DollarSign, color: 'text-emerald-500 bg-emerald-500/10' },
  milestone_verified: { icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-500/10' },
  milestone_submitted: { icon: Upload, color: 'text-blue-500 bg-blue-500/10' },
  yield_accrued: { icon: TrendingUp, color: 'text-purple-500 bg-purple-500/10' },
  escrow_funded: { icon: Wallet, color: 'text-emerald-500 bg-emerald-500/10' },
  contract_deployed: { icon: FileText, color: 'text-blue-500 bg-blue-500/10' },
  contract_signed: { icon: PenLine, color: 'text-emerald-500 bg-emerald-500/10' },
  dispute_opened: { icon: FileText, color: 'text-amber-500 bg-amber-500/10' },
  dispute_resolved: { icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-500/10' },
}

function groupActivitiesByDate(activities: ActivityItem[]): Record<string, ActivityItem[]> {
  const groups: Record<string, ActivityItem[]> = {}
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  for (const activity of activities) {
    const date = new Date(activity.timestamp)
    let key: string

    if (date.toDateString() === today.toDateString()) {
      key = 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      key = 'Yesterday'
    } else {
      key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }

    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(activity)
  }

  return groups
}

export function ActivityFeed({ activities, onLoadMore, isLoading, hasMore }: ActivityFeedProps) {
  const [filter, setFilter] = useState<string>('all')

  const filteredActivities = filter === 'all' 
    ? activities 
    : activities.filter(a => a.type === filter)

  const groupedActivities = groupActivitiesByDate(filteredActivities)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Activity</CardTitle>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[140px] h-8">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Activity</SelectItem>
            <SelectItem value="payment_released">Payments</SelectItem>
            <SelectItem value="milestone_verified">Verifications</SelectItem>
            <SelectItem value="milestone_submitted">Submissions</SelectItem>
            <SelectItem value="yield_accrued">Yield</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(groupedActivities).map(([date, items]) => (
            <div key={date}>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">{date}</h4>
              <div className="space-y-3">
                {items.map((activity) => {
                  const { icon: Icon, color } = activityIcons[activity.type]
                  return (
                    <div 
                      key={activity.id}
                      className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                    >
                      <div className={cn('flex items-center justify-center w-10 h-10 rounded-lg', color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-sm">{activity.title}</p>
                            <p className="text-sm text-muted-foreground">{activity.description}</p>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(activity.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </span>
                        </div>
                        {activity.txHash && (
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="h-auto p-0 mt-1 text-xs text-muted-foreground hover:text-primary"
                            asChild
                          >
                            <a 
                              href={`https://snowtrace.io/tx/${activity.txHash}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              TX: {activity.txHash.slice(0, 6)}...{activity.txHash.slice(-4)}
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {filteredActivities.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No activity to show
            </div>
          )}

          {hasMore && (
            <div className="text-center pt-4">
              <Button 
                variant="outline" 
                onClick={onLoadMore}
                disabled={isLoading}
                className="gap-2 bg-transparent"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
