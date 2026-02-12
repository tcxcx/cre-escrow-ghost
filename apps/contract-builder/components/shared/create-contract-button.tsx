'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useQueryState, parseAsString } from 'nuqs'
import { Plus, Sparkles, Upload, FileText } from 'lucide-react'
import { Button, type ButtonProps } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

// ── Helpers ─────────────────────────────────────────
function useCreateActions() {
  const pathname = usePathname()
  const router = useRouter()
  const [, setPanel] = useQueryState('panel', parseAsString)

  const navigateTo = (panel: string) => {
    if (pathname.startsWith('/builder')) {
      setPanel(panel)
    } else {
      router.push(`/builder?panel=${panel}`)
    }
  }

  return {
    newContract: () => navigateTo('new'),
    importPdf: () => navigateTo('import'),
    batchUpload: () => router.push('/contracts/upload'),
  }
}

// ── Dropdown variant (sidebar, toolbar) ─────────────
export function CreateContractDropdown({
  className,
  triggerClassName,
  side = 'right',
  align = 'start',
}: {
  className?: string
  triggerClassName?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
}) {
  const actions = useCreateActions()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          className={cn('w-full h-8 justify-start gap-2 text-xs', triggerClassName)}
        >
          <Plus className="h-3.5 w-3.5" />
          Create
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side={side} align={align} className={cn('w-52', className)}>
        <DropdownMenuItem className="cursor-pointer gap-2" onClick={actions.newContract}>
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-sm">New Contract</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer gap-2" onClick={actions.importPdf}>
          <Upload className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm">Import PDF</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer gap-2" onClick={actions.batchUpload}>
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm">Batch Upload</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ── Simple button variant (dashboard header, CTAs) ──
export function CreateContractButton({
  className,
  label = 'New Contract',
  ...props
}: ButtonProps & { label?: string }) {
  const actions = useCreateActions()

  return (
    <Button
      size="sm"
      className={cn('gap-2', className)}
      onClick={actions.newContract}
      {...props}
    >
      <Plus className="w-3.5 h-3.5" />
      {label}
    </Button>
  )
}
