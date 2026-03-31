import { describe, it, expect } from 'vitest';
import { filterServerActions } from '../server-gate';
import type { ServerActionDefinition } from '../server-gate';

const mockActions: ServerActionDefinition[] = [
  {
    name: 'viewTransactions',
    description: 'View transactions',
    parameters: {},
    handler: async () => [],
  },
  {
    name: 'createTransfer',
    description: 'Create a transfer',
    parameters: {},
    handler: async () => ({}),
  },
  {
    name: 'approveTransfer',
    description: 'Approve a transfer',
    parameters: {},
    handler: async () => ({}),
  },
  {
    name: 'manageBilling',
    description: 'Manage billing',
    parameters: {},
    handler: async () => ({}),
  },
];

describe('filterServerActions', () => {
  it('returns all actions for owner', () => {
    const result = filterServerActions(mockActions, {
      teamId: 'team-1',
      userRole: 'owner',
      tier: 'pro',
    });
    expect(result).toHaveLength(4);
  });

  it('filters out financial actions for viewer', () => {
    const result = filterServerActions(mockActions, {
      teamId: 'team-1',
      userRole: 'viewer',
      tier: 'pro',
    });
    expect(result.map((a) => a.name)).toEqual(['viewTransactions']);
  });

  it('allows manager to createTransfer but not approveTransfer', () => {
    const result = filterServerActions(mockActions, {
      teamId: 'team-1',
      userRole: 'manager',
      tier: 'pro',
    });
    const names = result.map((a) => a.name);
    expect(names).toContain('createTransfer');
    expect(names).toContain('viewTransactions');
    expect(names).not.toContain('approveTransfer');
    expect(names).not.toContain('manageBilling');
  });

  it('returns empty array when given empty actions', () => {
    const result = filterServerActions([], {
      teamId: 'team-1',
      userRole: 'viewer',
      tier: 'pro',
    });
    expect(result).toEqual([]);
  });
});
