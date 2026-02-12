'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'

export type ContractStatus = 
  | 'draft'
  | 'pending_signatures'
  | 'signing'
  | 'pending_funding'
  | 'funding'
  | 'active'
  | 'in_progress'
  | 'pending_verification'
  | 'completed'
  | 'disputed'
  | 'cancelled'

interface UseContractNavigationReturn {
  /** Navigate to the appropriate view based on contract status */
  navigateToContract: (contractId: string, status: ContractStatus) => void
  /** Navigate to contract builder */
  goToBuilder: () => void
  /** Navigate to contract list */
  goToContractList: () => void
  /** Navigate to dashboard */
  goToDashboard: () => void
  /** Navigate to signing view */
  goToSigning: (contractId: string) => void
  /** Navigate to funding view */
  goToFunding: (contractId: string) => void
  /** Navigate to contract dashboard */
  goToContractDashboard: (contractId: string) => void
  /** Navigate to milestone detail */
  goToMilestone: (contractId: string, milestoneId: string) => void
  /** Navigate to verification report */
  goToVerification: (contractId: string, milestoneId: string) => void
  /** Navigate to yield dashboard */
  goToYield: (contractId: string) => void
  /** Navigate to dispute view */
  goToDispute: (contractId: string) => void
  /** Navigate to completion view */
  goToCompletion: (contractId: string) => void
  /** Navigate to contract preview */
  goToPreview: (contractId: string) => void
  /** Go back to previous page */
  goBack: () => void
}

/**
 * Hook for navigating between contract views based on status
 */
export function useContractNavigation(): UseContractNavigationReturn {
  const router = useRouter()

  const navigateToContract = useCallback((contractId: string, status: ContractStatus) => {
    switch (status) {
      case 'draft':
        // Draft contracts go to builder (would need contract ID in query)
        router.push('/builder')
        break
      case 'pending_signatures':
      case 'signing':
        router.push(`/contracts/${contractId}/sign`)
        break
      case 'pending_funding':
      case 'funding':
        router.push(`/contracts/${contractId}/fund`)
        break
      case 'active':
      case 'in_progress':
      case 'pending_verification':
        router.push(`/contracts/${contractId}`)
        break
      case 'completed':
        router.push(`/contracts/${contractId}/complete`)
        break
      case 'disputed':
        router.push(`/contracts/${contractId}/dispute`)
        break
      case 'cancelled':
        router.push(`/contracts/${contractId}`)
        break
      default:
        router.push(`/contracts/${contractId}`)
    }
  }, [router])

  const goToBuilder = useCallback(() => {
    router.push('/builder')
  }, [router])

  const goToContractList = useCallback(() => {
    router.push('/contracts')
  }, [router])

  const goToDashboard = useCallback(() => {
    router.push('/')
  }, [router])

  const goToSigning = useCallback((contractId: string) => {
    router.push(`/contracts/${contractId}/sign`)
  }, [router])

  const goToFunding = useCallback((contractId: string) => {
    router.push(`/contracts/${contractId}/fund`)
  }, [router])

  const goToContractDashboard = useCallback((contractId: string) => {
    router.push(`/contracts/${contractId}`)
  }, [router])

  const goToMilestone = useCallback((contractId: string, milestoneId: string) => {
    router.push(`/contracts/${contractId}/milestones/${milestoneId}`)
  }, [router])

  const goToVerification = useCallback((contractId: string, milestoneId: string) => {
    router.push(`/contracts/${contractId}/milestones/${milestoneId}/verification`)
  }, [router])

  const goToYield = useCallback((contractId: string) => {
    router.push(`/contracts/${contractId}/yield`)
  }, [router])

  const goToDispute = useCallback((contractId: string) => {
    router.push(`/contracts/${contractId}/dispute`)
  }, [router])

  const goToCompletion = useCallback((contractId: string) => {
    router.push(`/contracts/${contractId}/complete`)
  }, [router])

  const goToPreview = useCallback((contractId: string) => {
    router.push(`/contracts/${contractId}/preview`)
  }, [router])

  const goBack = useCallback(() => {
    router.back()
  }, [router])

  return {
    navigateToContract,
    goToBuilder,
    goToContractList,
    goToDashboard,
    goToSigning,
    goToFunding,
    goToContractDashboard,
    goToMilestone,
    goToVerification,
    goToYield,
    goToDispute,
    goToCompletion,
    goToPreview,
    goBack,
  }
}
