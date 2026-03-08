import { getActionAvailability } from './permission-gate';
import type { ActionPermission } from './permission-gate';

export interface ServerActionDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  handler: (...args: unknown[]) => Promise<unknown>;
}

export interface ServerGateProperties {
  teamId: string;
  userRole: string;
  tier: string;
}

export function filterServerActions(
  actions: ServerActionDefinition[],
  properties: ServerGateProperties,
  permissions?: ActionPermission[]
): ServerActionDefinition[] {
  return actions.filter((action) => {
    const availability = getActionAvailability(
      action.name,
      properties.userRole,
      permissions
    );
    return availability === 'enabled';
  });
}
