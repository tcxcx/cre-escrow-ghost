import { describe, it, expect } from 'vitest';
import { buCatalog } from '../bu-catalog';
import { buCatalogSchema } from '../bu-catalog-schema';

describe('financial extensions', () => {
  const financialComponents = ['MetricCard', 'ApprovalCard', 'StepProgress', 'DataResult', 'InsightList'];

  it('all financial components are registered in catalog', () => {
    for (const name of financialComponents) {
      expect(buCatalog.components[name]).toBeDefined();
    }
  });

  it('all financial components have schema entries', () => {
    for (const name of financialComponents) {
      expect(buCatalogSchema.components[name]).toBeDefined();
      expect(buCatalogSchema.components[name].props).toBeDefined();
    }
  });

  it('MetricCard schema has required props', () => {
    const schema = buCatalogSchema.components.MetricCard;
    expect(schema.props.label).toContain('required');
    expect(schema.props.value).toContain('required');
  });

  it('ApprovalCard schema has required action props', () => {
    const schema = buCatalogSchema.components.ApprovalCard;
    expect(schema.props.approveAction).toContain('required');
    expect(schema.props.rejectAction).toContain('required');
  });

  it('StepProgress schema has required steps prop', () => {
    const schema = buCatalogSchema.components.StepProgress;
    expect(schema.props.steps).toContain('required');
  });

  it('InsightList schema has required insights prop', () => {
    const schema = buCatalogSchema.components.InsightList;
    expect(schema.props.insights).toContain('required');
  });

  it('catalog has 33 total components (18 standard + 5 financial + 10 chart)', () => {
    expect(Object.keys(buCatalog.components)).toHaveLength(33);
  });
});
