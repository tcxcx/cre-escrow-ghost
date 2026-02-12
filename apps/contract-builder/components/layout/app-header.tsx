'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bell,
  Wallet,
  ChevronDown,
  FileText,
  LayoutDashboard,
  PenTool,
  Settings,
  LogOut,
  Moon,
  Sun,
  Check,
  Plus,
  Upload,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'
import { ImportContractModal } from '@/components/contract-builder/import-contract-modal'

// Mock notifications - in production this would come from a store/API
const mockNotifications = [
  {
    id: '1',
    title: 'Contract Signed',
    message: 'Acme Corp signed the Freelance Agreement',
    time: '5 min ago',
    read: false,
  },
  {
    id: '2',
    title: 'Milestone Approved',
    message: 'Design mockups milestone was approved',
    time: '1 hour ago',
    read: false,
  },
  {
    id: '3',
    title: 'Payment Released',
    message: '$2,500 USDC has been released to your wallet',
    time: '2 hours ago',
    read: true,
  },
]

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/builder', label: 'Builder', icon: PenTool },
  { href: '/contracts', label: 'Contracts', icon: FileText },
]

export function AppHeader() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const [importModalOpen, setImportModalOpen] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Mock wallet state
  const isWalletConnected = false
  const walletAddress = '0x1234...5678'
  const usdcBalance = '12,450.00'

  const unreadCount = mockNotifications.filter(n => !n.read).length

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 lg:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mr-6">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">B</span>
          </div>
          <span className="font-semibold text-foreground hidden sm:inline-block">BUFI Contracts</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <item.icon className="w-4 h-4" />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Create New Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-2 h-9">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Create</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <a href="/builder" className="flex items-center gap-2 cursor-pointer">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <div>
                    <div className="font-medium">New Contract</div>
                    <div className="text-xs text-muted-foreground">Start from template or AI</div>
                  </div>
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setImportModalOpen(true)} className="flex items-center gap-2 cursor-pointer">
                <Upload className="h-4 w-4 text-emerald-500" />
                <div>
                  <div className="font-medium">Import Contract</div>
                  <div className="text-xs text-muted-foreground">Upload PDF to create template</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="/contracts/upload" className="flex items-center gap-2 cursor-pointer">
                  <FileText className="h-4 w-4 text-amber-500" />
                  <div>
                    <div className="font-medium">Batch Upload</div>
                    <div className="text-xs text-muted-foreground">CSV or AI-powered bulk send</div>
                  </div>
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Toggle */}
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          )}

          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 relative">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h4 className="font-semibold text-sm">Notifications</h4>
                <Button variant="ghost" size="sm" className="text-xs h-auto py-1 px-2">
                  Mark all read
                </Button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {mockNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      'flex gap-3 px-4 py-3 border-b border-border/50 last:border-0 hover:bg-muted/50 cursor-pointer',
                      !notification.read && 'bg-primary/5'
                    )}
                  >
                    <div className={cn(
                      'w-2 h-2 rounded-full mt-2 flex-shrink-0',
                      notification.read ? 'bg-transparent' : 'bg-primary'
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{notification.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 border-t border-border">
                <Link href="/notifications" className="text-xs text-primary hover:underline">
                  View all notifications
                </Link>
              </div>
            </PopoverContent>
          </Popover>

          {/* Wallet Button */}
          {isWalletConnected ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 h-9 bg-transparent">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="hidden sm:inline font-mono text-xs">{walletAddress}</span>
                  <Badge variant="secondary" className="hidden md:flex ml-1 text-xs font-normal">
                    ${usdcBalance}
                  </Badge>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem>
                  <span className="text-xs text-muted-foreground">USDC Balance</span>
                  <span className="ml-auto font-mono">${usdcBalance}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  Wallet Settings
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" className="gap-2 h-9">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Connect Wallet</span>
            </Button>
          )}
        </div>
      </div>

      {/* Import Contract Modal */}
      <ImportContractModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onImportComplete={(templateId) => {
          setImportModalOpen(false)
          window.location.href = `/builder?template=${templateId}`
        }}
      />
    </header>
  )
}
