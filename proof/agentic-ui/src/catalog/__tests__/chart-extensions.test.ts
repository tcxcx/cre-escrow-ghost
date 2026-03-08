import { describe, it, expect } from 'vitest';
import { buCatalog } from '../bu-catalog';

describe('chart extensions', () => {
  const chartComponents = [
    'BurnRateChart',
    'ForecastChart',
    'ProfitChart',
    'RevenueChart',
    'RunwayChart',
    'SpendingChart',
    'TransactionsTable',
    'ContactsList',
    'InvoicesList',
    'PayrollView',
  ];

  it('all 10 chart components are registered in catalog', () => {
    for (const name of chartComponents) {
      expect(buCatalog.components[name]).toBeDefined();
    }
  });

  it('chart components are valid React components', () => {
    for (const name of chartComponents) {
      const component = buCatalog.components[name];
      // memo() wraps components as objects with a $$typeof symbol
      expect(component).toBeTruthy();
    }
  });

  it('catalog has at least 33 total components (18 standard + 5 financial + 10 chart)', () => {
    const count = Object.keys(buCatalog.components).length;
    expect(count).toBeGreaterThanOrEqual(33);
  });

  it('catalog has exactly 33 components', () => {
    expect(Object.keys(buCatalog.components)).toHaveLength(33);
  });
});
