import { describe, test, expect } from 'bun:test';
import { checkCompliance, syncAllowListFromPersona } from './index';

describe('compliance', () => {
  test('checkCompliance is exported', () => {
    expect(typeof checkCompliance).toBe('function');
  });

  test('syncAllowListFromPersona is exported', () => {
    expect(typeof syncAllowListFromPersona).toBe('function');
  });
});
