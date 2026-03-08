/**
 * @package shared/navigation
 * Centralized contract navigation logic.
 * Eliminates 3 duplicate getContractDestination / getContractHref implementations
 * across contracts-widget.tsx, contracts-list.tsx, and home-dashboard.tsx.
 */

export type ContractStatus =
  | 'draft'
  | 'pending-signatures'
  | 'pending-funding'
  | 'pending_sign'
  | 'pending_fund'
  | 'active'
  | 'completed'
  | 'disputed'
  | 'cancelled'
  // Home dashboard uses underscore variants
  | 'pending_signatures'
  | 'funded'

/**
 * Given a contract's ID and status, return the correct destination URL.
 * This is the SINGLE source of truth for status-based routing.
 */
export function getContractDestination(contractId: string, status: string): string {
  const base = `/contracts/${contractId}`

  switch (status) {
    case 'draft':
      return `/builder?edit=${contractId}`

    case 'pending-signatures':
    case 'pending_signatures':
    case 'pending_sign':
      return `${base}/sign`

    case 'pending-funding':
    case 'pending_fund':
      return `${base}/fund`

    case 'funded':
    case 'active':
      return base

    case 'completed':
      return `${base}/complete`

    case 'disputed':
      return `${base}/arbitration`

    case 'cancelled':
    default:
      return base
  }
}
