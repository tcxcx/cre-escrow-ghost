'use client'

import React, { useState } from 'react'
import {
  ArrowRight,
  Search,
  User,
  Mail,
  Wallet,
  UserCheck,
  FileText,
  DollarSign,
  Coins,
  Target,
  AlignLeft,
  Calendar,
  Clock,
  MessageSquare,
  X,
  Check,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@bu/ui/cn'
import { useBatchStore } from '@/lib/batch-store'
import { BUFI_CONTRACT_FIELDS, type BufiFieldKey } from '@/types/batch'

const iconMap: Record<string, React.ElementType> = {
  User, Mail, Wallet, UserCheck, FileText, DollarSign, Coins,
  Target, AlignLeft, Calendar, Clock, MessageSquare, X,
}

function FieldIcon({ iconName, className }: { iconName: string; className?: string }) {
  const Icon = iconMap[iconName] || FileText
  return <Icon className={cn('w-4 h-4', className)} />
}

export function StepMapping() {
  const { parsedCsv, mappings, updateMapping, setRecipients, setStep } = useBatchStore()
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const mappedColumns = mappings.filter((m) => m.bufiField !== 'skip')

  if (!parsedCsv) return null

  const usedFields = new Set(mappings.filter((m) => m.bufiField !== 'skip').map((m) => m.bufiField))

  const filteredFields = BUFI_CONTRACT_FIELDS.filter((f) =>
    searchQuery === '' || f.label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Check if required fields are mapped
  const requiredMapped = BUFI_CONTRACT_FIELDS
    .filter((f) => f.required)
    .every((f) => usedFields.has(f.key))

  // Separate into auto-mapped (known) and custom columns
  const unmappedColumns = mappings.filter((m) => m.bufiField === 'skip')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Map your CSV columns</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Map your CSV columns to BUFI contract fields. Each must be mapped to proceed.
        </p>
      </div>

      {/* Mapping rows */}
      <div className="space-y-6">
        {/* Main mappings */}
        <div className="space-y-0">
          <div className="grid grid-cols-[1fr_40px_1fr] gap-0 items-center mb-3 px-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">CSV Columns</span>
            <span />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">BUFI Fields</span>
          </div>

          <div className="space-y-2">
            {mappings.map((mapping) => {
              const col = parsedCsv.columns.find((c) => c.name === mapping.csvColumn)
              if (!col) return null

              const selectedField = BUFI_CONTRACT_FIELDS.find((f) => f.key === mapping.bufiField)
              const isOpen = openDropdown === mapping.csvColumn

              return (
                <div
                  key={mapping.csvColumn}
                  className="grid grid-cols-[1fr_40px_1fr] gap-0 items-center"
                >
                  {/* CSV column (left) */}
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5">
                    <span className="text-sm font-medium text-foreground">{col.name}</span>
                    {col.sampleValues[0] && (
                      <span className="text-xs text-muted-foreground truncate">
                        ({col.sampleValues[0]})
                      </span>
                    )}
                  </div>

                  {/* Arrow */}
                  <div className="flex items-center justify-center">
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>

                  {/* BUFI field dropdown (right) */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setOpenDropdown(isOpen ? null : mapping.csvColumn)
                        setSearchQuery('')
                      }}
                      className={cn(
                        'w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors text-left',
                        mapping.bufiField === 'skip'
                          ? 'border-border bg-muted/50 text-muted-foreground'
                          : 'border-border bg-card text-foreground'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {selectedField && selectedField.key !== 'skip' && (
                          <FieldIcon iconName={selectedField.icon} className="shrink-0 text-muted-foreground" />
                        )}
                        <span className="truncate">
                          {selectedField ? selectedField.label : 'Select field...'}
                        </span>
                        {selectedField?.required && (
                          <span className="text-xs text-muted-foreground">(required)</span>
                        )}
                      </div>
                      <ChevronDown className={cn('w-4 h-4 shrink-0 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
                    </button>

                    {/* Dropdown */}
                    {isOpen && (
                      <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                        {/* Search */}
                        <div className="p-2 border-b border-border">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <input
                              type="text"
                              placeholder="Search BUFI fields"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full pl-8 pr-3 py-1.5 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                              autoFocus
                            />
                          </div>
                        </div>

                        {/* Options */}
                        <div className="max-h-48 overflow-y-auto p-1">
                          {filteredFields.map((field) => {
                            const isUsed = usedFields.has(field.key) && field.key !== mapping.bufiField && field.key !== 'skip'
                            const isSelected = mapping.bufiField === field.key

                            return (
                              <button
                                key={field.key}
                                type="button"
                                disabled={isUsed}
                                onClick={() => {
                                  updateMapping(mapping.csvColumn, field.key)
                                  setOpenDropdown(null)
                                }}
                                className={cn(
                                  'w-full flex items-center gap-2 px-2.5 py-2 text-sm rounded-md transition-colors text-left',
                                  isSelected && 'bg-primary/10 text-primary',
                                  isUsed && 'opacity-40 cursor-not-allowed',
                                  !isSelected && !isUsed && 'hover:bg-muted'
                                )}
                              >
                                <FieldIcon iconName={field.icon} className="shrink-0" />
                                <span className="flex-1">{field.label}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Custom/unmapped columns section */}
        {unmappedColumns.length > 0 && mappedColumns.length > 0 && (
          <div className="pt-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
              Unmapped columns ({unmappedColumns.length})
            </span>
          </div>
        )}
      </div>

      {/* Validation summary */}
      {!requiredMapped && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          Please map all required fields: {BUFI_CONTRACT_FIELDS.filter((f) => f.required && !usedFields.has(f.key)).map((f) => f.label).join(', ')}
        </div>
      )}
    </div>
  )
}
