import { describe, it, expect } from 'vitest';
import {
  getActionAvailability,
  getDisabledActions,
  BU_ACTION_PERMISSIONS,
} from '../permission-gate';

describe('getActionAvailability', () => {
  it('returns enabled for viewer on viewTransactions', () => {
    expect(getActionAvailability('viewTransactions', 'viewer')).toBe('enabled');
  });

  it('returns disabled for viewer on createTransfer', () => {
    expect(getActionAvailability('createTransfer', 'viewer')).toBe('disabled');
  });

  it('returns disabled for member on createTransfer', () => {
    expect(getActionAvailability('createTransfer', 'member')).toBe('disabled');
  });

  it('returns enabled for manager on createTransfer', () => {
    expect(getActionAvailability('createTransfer', 'manager')).toBe('enabled');
  });

  it('returns enabled for admin on approveTransfer', () => {
    expect(getActionAvailability('approveTransfer', 'admin')).toBe('enabled');
  });

  it('returns disabled for manager on approveTransfer', () => {
    expect(getActionAvailability('approveTransfer', 'manager')).toBe('disabled');
  });

  it('returns enabled for unknown actions (not in registry)', () => {
    expect(getActionAvailability('someNewAction', 'viewer')).toBe('enabled');
  });

  it('returns enabled for owner on all actions', () => {
    BU_ACTION_PERMISSIONS.forEach((p) => {
      expect(getActionAvailability(p.action, 'owner')).toBe('enabled');
    });
  });
});

describe('getDisabledActions', () => {
  it('returns empty for owner', () => {
    expect(getDisabledActions('owner')).toEqual([]);
  });

  it('returns financial actions for viewer', () => {
    const disabled = getDisabledActions('viewer');
    expect(disabled).toContain('createTransfer');
    expect(disabled).toContain('approveTransfer');
    expect(disabled).toContain('createPayroll');
    expect(disabled).toContain('manageBilling');
    expect(disabled).not.toContain('viewTransactions');
  });

  it('returns fewer disabled actions for admin than member', () => {
    const memberDisabled = getDisabledActions('member');
    const adminDisabled = getDisabledActions('admin');
    expect(adminDisabled.length).toBeLessThan(memberDisabled.length);
  });
});
