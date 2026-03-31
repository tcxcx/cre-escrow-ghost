import { ROLE_HIERARCHY as PLATFORM_ROLES } from '@bu/rbac';

export interface ActionPermission {
  action: string;
  permission: string;
  minRole?: string;
}

/**
 * Extended role hierarchy for CopilotKit action gating.
 * Uses @bu/rbac's ROLE_HIERARCHY as the authoritative base (member:1, admin:2, owner:3),
 * plus CopilotKit-specific levels (viewer:0, manager:1.5) for finer-grained control.
 */
const ROLE_HIERARCHY: Record<string, number> = {
  viewer: 0,
  ...Object.fromEntries(
    Object.entries(PLATFORM_ROLES).map(([role, level]) => [role, level])
  ),
  // CopilotKit extension: manager sits between member(1) and admin(2)
  manager: 1.5,
};

function meetsMinimumRole(userRole: string, minRole: string): boolean {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[minRole] ?? 999);
}

export const BU_ACTION_PERMISSIONS: ActionPermission[] = [
  { action: 'createTransfer', permission: 'transfers.create', minRole: 'manager' },
  { action: 'approveTransfer', permission: 'transfers.approve', minRole: 'admin' },
  { action: 'createInvoice', permission: 'invoices.create', minRole: 'member' },
  { action: 'sendInvoice', permission: 'invoices.send', minRole: 'member' },
  { action: 'createPayroll', permission: 'payroll.create', minRole: 'manager' },
  { action: 'approvePayroll', permission: 'payroll.approve', minRole: 'admin' },
  { action: 'viewTransactions', permission: 'transactions.read', minRole: 'viewer' },
  { action: 'manageTeam', permission: 'team.manage', minRole: 'admin' },
  { action: 'manageBilling', permission: 'billing.manage', minRole: 'owner' },
];

export function getActionAvailability(
  actionName: string,
  userRole: string,
  permissions?: ActionPermission[]
): 'enabled' | 'disabled' {
  const registry = permissions ?? BU_ACTION_PERMISSIONS;
  const entry = registry.find((p) => p.action === actionName);
  if (!entry) return 'enabled';
  if (entry.minRole && !meetsMinimumRole(userRole, entry.minRole)) {
    return 'disabled';
  }
  return 'enabled';
}

export function getDisabledActions(
  userRole: string,
  permissions?: ActionPermission[]
): string[] {
  const registry = permissions ?? BU_ACTION_PERMISSIONS;
  return registry
    .filter((p) => getActionAvailability(p.action, userRole, registry) === 'disabled')
    .map((p) => p.action);
}
