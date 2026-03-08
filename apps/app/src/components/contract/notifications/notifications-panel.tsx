'use client'

import React from "react"

import { useState } from 'react'
import { Button } from '@bu/ui/button'
import { ScrollArea } from '@bu/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@bu/ui/sheet'
import {
  Bell,
  CheckCircle2,
  DollarSign,
  FileText,
  AlertTriangle,
  X,
} from 'lucide-react'
import { cn } from '@bu/ui/cn'

export type NotificationType = 
  | 'milestone_verified'
  | 'contract_received'
  | 'counterparty_signed'
  | 'payment_released'
  | 'dispute_opened'
  | 'yield_update'

interface Notification {
  id: string
  type: NotificationType
  title: string
  description: string
  contractName?: string
  timestamp: string
  read: boolean
  actionUrl?: string
}

interface NotificationsPanelProps {
  notifications: Notification[]
  onMarkAllRead: () => void
  onMarkRead: (id: string) => void
  onDismiss: (id: string) => void
}

const notificationIcons: Record<NotificationType, { icon: React.ElementType; color: string }> = {
  milestone_verified: { icon: CheckCircle2, color: 'text-emerald-500' },
  contract_received: { icon: FileText, color: 'text-blue-500' },
  counterparty_signed: { icon: CheckCircle2, color: 'text-emerald-500' },
  payment_released: { icon: DollarSign, color: 'text-emerald-500' },
  dispute_opened: { icon: AlertTriangle, color: 'text-amber-500' },
  yield_update: { icon: DollarSign, color: 'text-purple-500' },
}

export function NotificationsPanel({ 
  notifications, 
  onMarkAllRead, 
  onMarkRead,
  onDismiss 
}: NotificationsPanelProps) {
  const [open, setOpen] = useState(false)
  const unreadCount = notifications.filter(n => !n.read).length

  const newNotifications = notifications.filter(n => !n.read)
  const earlierNotifications = notifications.filter(n => n.read)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md p-0">
        <SheetHeader className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </SheetTitle>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onMarkAllRead}
                className="text-xs"
              >
                Mark All Read
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-80px)]">
          <div className="p-4 space-y-6">
            {newNotifications.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  NEW
                </h4>
                <div className="space-y-2">
                  {newNotifications.map((notification) => {
                    const { icon: Icon, color } = notificationIcons[notification.type]
                    return (
                      <div
                        key={notification.id}
                        className={cn(
                          'relative p-4 rounded-lg border border-border bg-primary/5',
                          'hover:bg-muted/50 transition-colors cursor-pointer'
                        )}
                        onClick={() => onMarkRead(notification.id)}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onDismiss(notification.id)
                          }}
                          className="absolute top-2 right-2 p-1 rounded-md hover:bg-muted"
                        >
                          <X className="h-3 w-3 text-muted-foreground" />
                        </button>
                        <div className="flex items-start gap-3 pr-6">
                          <div className="relative">
                            <Icon className={cn('h-5 w-5', color)} />
                            <span className="absolute -top-1 -left-1 w-2 h-2 bg-primary rounded-full" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium text-sm">{notification.title}</p>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {notification.timestamp}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {notification.description}
                            </p>
                            {notification.contractName && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {notification.contractName}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {earlierNotifications.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  EARLIER
                </h4>
                <div className="space-y-2">
                  {earlierNotifications.map((notification) => {
                    const { icon: Icon, color } = notificationIcons[notification.type]
                    return (
                      <div
                        key={notification.id}
                        className={cn(
                          'relative p-4 rounded-lg border border-border',
                          'hover:bg-muted/30 transition-colors cursor-pointer'
                        )}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onDismiss(notification.id)
                          }}
                          className="absolute top-2 right-2 p-1 rounded-md hover:bg-muted"
                        >
                          <X className="h-3 w-3 text-muted-foreground" />
                        </button>
                        <div className="flex items-start gap-3 pr-6">
                          <Icon className={cn('h-5 w-5', color)} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium text-sm text-muted-foreground">
                                {notification.title}
                              </p>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {notification.timestamp}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {notification.description}
                            </p>
                            {notification.contractName && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {notification.contractName}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {notifications.length === 0 && (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">No notifications yet</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
