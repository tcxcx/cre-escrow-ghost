/**
 * Catalog parity test — verifies web catalog has all component types
 * that the native catalog requires.
 *
 * Native components import react-native (unavailable in vitest/Node),
 * so we verify the web side covers the native MVP component list.
 * The native catalog itself is verified at Expo build time.
 */
import { describe, it, expect } from 'vitest'
import { buCatalog } from '../../catalog/bu-catalog'

const MVP_COMPONENTS = [
  'Text', 'Row', 'Column', 'Card', 'List', 'Button',
  'MetricCard', 'ApprovalCard', 'DataResult', 'InsightList', 'StepProgress',
] as const

describe('native catalog parity', () => {
  it('web catalog covers all 11 MVP component types needed by native', () => {
    for (const name of MVP_COMPONENTS) {
      expect(buCatalog.components[name], `missing: ${name}`).toBeDefined()
      // memo() wraps return 'object', plain components return 'function'
      const t = typeof buCatalog.components[name]
      expect(t === 'function' || t === 'object', `${name} is ${t}`).toBe(true)
    }
  })

  it('MVP count is 11', () => {
    expect(MVP_COMPONENTS.length).toBe(11)
  })

  it('web catalog has at least 18 standard + 5 financial + 10 chart = 33 components', () => {
    expect(Object.keys(buCatalog.components).length).toBeGreaterThanOrEqual(33)
  })

  it('catalog structure is valid', () => {
    expect(buCatalog).toHaveProperty('components')
    expect(buCatalog).toHaveProperty('functions')
  })
})
