import { describe, test, expect } from 'bun:test';
import { parseUsdcAmount, formatUsdcAmount } from './amount';

describe('parseUsdcAmount', () => {
  test('whole number', () => {
    expect(parseUsdcAmount('5000')).toBe(5_000_000_000n);
    expect(parseUsdcAmount('1')).toBe(1_000_000n);
    expect(parseUsdcAmount('0')).toBe(0n);
  });

  test('decimal amounts', () => {
    expect(parseUsdcAmount('100.50')).toBe(100_500_000n);
    expect(parseUsdcAmount('0.01')).toBe(10_000n);
    expect(parseUsdcAmount('0.000001')).toBe(1n);
  });

  test('100.10 precision — floating point would fail this', () => {
    // parseFloat("100.10") * 1e6 = 100099999.99999999 → rounds to 100100000
    // But ONLY by luck. "33.10" * 1e6 = 33099999.999... → 33100000 (ok)
    // Our BigInt parser never has this ambiguity.
    expect(parseUsdcAmount('100.10')).toBe(100_100_000n);
    expect(parseUsdcAmount('33.10')).toBe(33_100_000n);
  });

  test('leading/trailing whitespace', () => {
    expect(parseUsdcAmount('  5000  ')).toBe(5_000_000_000n);
  });

  test('rejects negative', () => {
    expect(() => parseUsdcAmount('-100')).toThrow('cannot be negative');
  });

  test('rejects empty', () => {
    expect(() => parseUsdcAmount('')).toThrow('cannot be empty');
  });

  test('rejects more than 6 decimals', () => {
    expect(() => parseUsdcAmount('1.0000001')).toThrow('more than 6');
  });
});

describe('formatUsdcAmount', () => {
  test('whole number', () => {
    expect(formatUsdcAmount(5_000_000_000n)).toBe('5000.00');
  });

  test('decimal amount', () => {
    expect(formatUsdcAmount(100_500_000n)).toBe('100.50');
  });

  test('small amount', () => {
    expect(formatUsdcAmount(10_000n)).toBe('0.01');
  });

  test('zero', () => {
    expect(formatUsdcAmount(0n)).toBe('0.00');
  });

  test('one wei', () => {
    expect(formatUsdcAmount(1n)).toBe('0.000001');
  });

  test('roundtrip', () => {
    const cases = ['5000.00', '100.50', '0.01', '33.10', '0.000001'];
    for (const c of cases) {
      expect(formatUsdcAmount(parseUsdcAmount(c))).toBe(c);
    }
  });
});
