'use client'

import { useState } from 'react'
import {
  Filter,
  X,
  Calendar,
  DollarSign,
  Users,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@bu/ui/button'
import { Badge } from '@bu/ui/badge'
import { Label } from '@bu/ui/label'
import { Checkbox } from '@bu/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@bu/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@bu/ui/select'
import { Slider } from '@bu/ui/slider'
import { cn } from '@bu/ui/cn'
import type { ContractStatus } from '@/types/contracts'

export interface ContractFilters {
  statuses: ContractStatus[]
  valueRange: [number, number]
  dateRange: 'all' | '7d' | '30d' | '90d' | 'custom'
  role: 'all' | 'payer' | 'payee'
  hasYield: boolean | null
  sortBy: 'updated' | 'created' | 'value' | 'name'
  sortOrder: 'asc' | 'desc'
}

interface ContractsFilterProps {
  filters: ContractFilters
  onFiltersChange: (filters: ContractFilters) => void
  maxValue?: number
  className?: string
}

const statusOptions: { value: ContractStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Draft', color: 'bg-zinc-500' },
  { value: 'pending-signatures', label: 'Pending Signatures', color: 'bg-primary' },
  { value: 'pending-funding', label: 'Pending Funding', color: 'bg-amber-500' },
  { value: 'active', label: 'Active', color: 'bg-emerald-500' },
  { value: 'completed', label: 'Completed', color: 'bg-blue-500' },
  { value: 'disputed', label: 'Disputed', color: 'bg-red-500' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-zinc-400' },
]

const dateRangeOptions = [
  { value: 'all', label: 'All Time' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
]

export function ContractsFilter({
  filters,
  onFiltersChange,
  maxValue = 100000,
  className,
}: ContractsFilterProps) {
  const [open, setOpen] = useState(false)
  
  const activeFilterCount = [
    filters.statuses.length > 0 && filters.statuses.length < statusOptions.length,
    filters.valueRange[0] > 0 || filters.valueRange[1] < maxValue,
    filters.dateRange !== 'all',
    filters.role !== 'all',
    filters.hasYield !== null,
  ].filter(Boolean).length

  const handleStatusToggle = (status: ContractStatus) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter(s => s !== status)
      : [...filters.statuses, status]
    onFiltersChange({ ...filters, statuses: newStatuses })
  }

  const handleResetFilters = () => {
    onFiltersChange({
      statuses: [],
      valueRange: [0, maxValue],
      dateRange: 'all',
      role: 'all',
      hasYield: null,
      sortBy: 'updated',
      sortOrder: 'desc',
    })
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`
    }
    return `$${value}`
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Main Filter Popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={cn(
              'gap-2 bg-transparent',
              activeFilterCount > 0 && 'border-primary'
            )}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-primary text-primary-foreground">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-0">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Filters</h4>
              {activeFilterCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleResetFilters}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                >
                  Reset all
                </Button>
              )}
            </div>
          </div>

          <div className="p-4 space-y-5 max-h-[400px] overflow-y-auto">
            {/* Status Filter */}
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Status
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleStatusToggle(option.value)}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-md border text-sm transition-colors',
                      filters.statuses.includes(option.value)
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-muted/50'
                    )}
                  >
                    <div className={cn('w-2 h-2 rounded-full', option.color)} />
                    <span className="truncate">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Value Range */}
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Contract Value
              </Label>
              <div className="pt-2 px-1">
                <Slider
                  value={filters.valueRange}
                  onValueChange={(value) => onFiltersChange({ ...filters, valueRange: value as [number, number] })}
                  max={maxValue}
                  min={0}
                  step={1000}
                  className="w-full"
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatCurrency(filters.valueRange[0])}</span>
                <span>{formatCurrency(filters.valueRange[1])}</span>
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Date Range
              </Label>
              <Select
                value={filters.dateRange}
                onValueChange={(value) => onFiltersChange({ ...filters, dateRange: value as ContractFilters['dateRange'] })}
              >
                <SelectTrigger className="w-full">
                  <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dateRangeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Role */}
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                My Role
              </Label>
              <Select
                value={filters.role}
                onValueChange={(value) => onFiltersChange({ ...filters, role: value as ContractFilters['role'] })}
              >
                <SelectTrigger className="w-full">
                  <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Contracts</SelectItem>
                  <SelectItem value="payer">I'm the Payer</SelectItem>
                  <SelectItem value="payee">I'm the Payee</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Yield Filter */}
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                Has yield earnings
              </Label>
              <Checkbox
                checked={filters.hasYield === true}
                onCheckedChange={(checked) => 
                  onFiltersChange({ ...filters, hasYield: checked ? true : null })
                }
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Sort Options */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
            <SlidersHorizontal className="w-4 h-4" />
            Sort
            <ChevronDown className="w-3 h-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-48 p-2">
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => onFiltersChange({ ...filters, sortBy: 'updated', sortOrder: 'desc' })}
              className={cn(
                'w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-muted/50',
                filters.sortBy === 'updated' && 'bg-muted'
              )}
            >
              Last Updated
            </button>
            <button
              type="button"
              onClick={() => onFiltersChange({ ...filters, sortBy: 'created', sortOrder: 'desc' })}
              className={cn(
                'w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-muted/50',
                filters.sortBy === 'created' && 'bg-muted'
              )}
            >
              Date Created
            </button>
            <button
              type="button"
              onClick={() => onFiltersChange({ ...filters, sortBy: 'value', sortOrder: 'desc' })}
              className={cn(
                'w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-muted/50',
                filters.sortBy === 'value' && 'bg-muted'
              )}
            >
              Highest Value
            </button>
            <button
              type="button"
              onClick={() => onFiltersChange({ ...filters, sortBy: 'value', sortOrder: 'asc' })}
              className={cn(
                'w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-muted/50',
                filters.sortBy === 'value' && filters.sortOrder === 'asc' && 'bg-muted'
              )}
            >
              Lowest Value
            </button>
            <button
              type="button"
              onClick={() => onFiltersChange({ ...filters, sortBy: 'name', sortOrder: 'asc' })}
              className={cn(
                'w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-muted/50',
                filters.sortBy === 'name' && 'bg-muted'
              )}
            >
              Name (A-Z)
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filter Tags */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {filters.statuses.length > 0 && filters.statuses.length < statusOptions.length && (
            <Badge variant="secondary" className="gap-1 h-6 pr-1">
              {filters.statuses.length} status{filters.statuses.length > 1 ? 'es' : ''}
              <button
                type="button"
                onClick={() => onFiltersChange({ ...filters, statuses: [] })}
                className="p-0.5 rounded hover:bg-muted"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.dateRange !== 'all' && (
            <Badge variant="secondary" className="gap-1 h-6 pr-1">
              {dateRangeOptions.find(o => o.value === filters.dateRange)?.label}
              <button
                type="button"
                onClick={() => onFiltersChange({ ...filters, dateRange: 'all' })}
                className="p-0.5 rounded hover:bg-muted"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.role !== 'all' && (
            <Badge variant="secondary" className="gap-1 h-6 pr-1">
              {filters.role === 'payer' ? 'Payer' : 'Payee'}
              <button
                type="button"
                onClick={() => onFiltersChange({ ...filters, role: 'all' })}
                className="p-0.5 rounded hover:bg-muted"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
