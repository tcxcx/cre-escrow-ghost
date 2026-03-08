/**
 * Role Guard Service
 * 
 * Provides role-based access control for team operations.
 * Validates user permissions for performing team swaps.
 */

import type { TeamRole } from '@bu/types/rbac';
import { hasMinimumRole } from '@bu/rbac';
import { getUserTeamRole as getUserTeamRoleQuery } from '@bu/supabase/queries';
import { createLogger } from '@bu/logger';

const logger = createLogger({ prefix: 'transfer-core:role-guard', theme: 'minimal' });

// Re-export for backward compatibility
export type { TeamRole };

export interface RoleGuardParams {
  userId: string;
  teamId: string;
}

export interface RoleGuardResult {
  canPerform: boolean;
  role: TeamRole | null;
}

/**
 * Role Guard Service
 * Validates user permissions against Supabase users_on_team table
 */
export class RoleGuard {
  constructor(private supabase: any) {}

  /**
   * Get user's role in a team
   * @param params - User ID and Team ID
   * @returns User's role or null if not found
   */
  async getUserTeamRole(params: RoleGuardParams): Promise<TeamRole | null> {
    const { userId, teamId } = params;

    try {
      const role = await getUserTeamRoleQuery(this.supabase, userId, teamId);
      return role as TeamRole | null;
    } catch (error) {
      logger.error('Error fetching user role', error instanceof Error ? error : undefined);
      return null;
    }
  }

  /**
   * Check if user can perform team swap operations
   * Only owners and admins can perform team swaps
   * @param params - User ID and Team ID
   * @returns Boolean indicating if user can perform team swap
   */
  async canPerformTeamSwap(params: RoleGuardParams): Promise<boolean> {
    const role = await this.getUserTeamRole(params);

    if (!role) {
      return false;
    }

    // Only owners and admins can perform team swaps
    return hasMinimumRole(role, 'admin');
  }

  /**
   * Check if user can perform individual swap operations
   * All authenticated users can swap their own individual wallets
   * @param params - User ID (teamId not required for individual swaps)
   * @returns Boolean indicating if user can perform individual swap
   */
  async canPerformIndividualSwap(params: { userId: string }): Promise<boolean> {
    // For individual swaps, we just need to verify the user exists
    // The wallet ownership is validated separately
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('id')
        .eq('id', params.userId)
        .single();

      return !error && !!data;
    } catch (error) {
      logger.error('Error verifying user', error instanceof Error ? error : undefined);
      return false;
    }
  }

  /**
   * Get full role guard result with role information
   * @param params - User ID and Team ID
   * @returns RoleGuardResult with canPerform flag and role
   */
  async getRoleGuardResult(params: RoleGuardParams): Promise<RoleGuardResult> {
    const role = await this.getUserTeamRole(params);
    const canPerform = role !== null && hasMinimumRole(role, 'admin');

    return {
      canPerform,
      role,
    };
  }
}

