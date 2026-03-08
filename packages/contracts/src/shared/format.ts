/**
 * @package shared/format
 * Centralized formatting utilities used across the entire app.
 * Eliminates 25+ inline Intl.NumberFormat / toLocaleString instances.
 */

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const currencyFormatterDecimals = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const compactFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  compactDisplay: 'short',
})

/**
 * Format a number as currency (e.g. "$12,500")
 * @param amount - The numeric amount
 * @param options - Optional config: decimals (show cents), compact (abbreviate)
 */
export function formatCurrency(
  amount: number,
  options?: { decimals?: boolean; compact?: boolean }
): string {
  if (options?.compact) return compactFormatter.format(amount)
  if (options?.decimals) return currencyFormatterDecimals.format(amount)
  return currencyFormatter.format(amount)
}

/**
 * Format a number with locale-aware commas (e.g. "12,500")
 */
export function formatNumber(value: number): string {
  return value.toLocaleString('en-US')
}

/**
 * Format a date in short form (e.g. "Jan 15, 2026")
 */
export function formatDate(date: Date | string, style: 'short' | 'long' | 'relative' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date

  if (style === 'relative') {
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHrs = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHrs < 24) return `${diffHrs}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    // Fall through to short format
  }

  if (style === 'long') {
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Format a date as time only (e.g. "2:30 PM")
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Truncate a wallet address for display (e.g. "0x1234...abcd")
 */
export function formatAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 3) return address
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

/**
 * Format a percentage (e.g. "85.5%")
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}
