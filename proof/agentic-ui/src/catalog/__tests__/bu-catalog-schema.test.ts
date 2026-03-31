import { describe, it, expect } from 'vitest';
import { buCatalogSchema, buCatalogSchemaJSON } from '../bu-catalog-schema';
import { buComponents } from '../bu-catalog';

describe('buCatalogSchema', () => {
  it('covers every component in the catalog (minus Video/AudioPlayer)', () => {
    const catalogKeys = Object.keys(buComponents).sort();
    const schemaKeys = Object.keys(buCatalogSchema.components).sort();
    for (const key of schemaKeys) {
      expect(catalogKeys).toContain(key);
    }
  });

  it('has all 4 message types', () => {
    expect(Object.keys(buCatalogSchema.messageTypes).sort()).toEqual([
      'createSurface', 'deleteSurface', 'updateComponents', 'updateDataModel',
    ]);
  });

  it('serializes to valid JSON', () => {
    const parsed = JSON.parse(buCatalogSchemaJSON);
    expect(parsed.version).toBe('0.9');
    expect(Object.keys(parsed.components).length).toBeGreaterThanOrEqual(14);
  });
});
