import { formatRupiah } from './currency';

describe('formatRupiah', () => {
  it('formats zero', () => {
    expect(formatRupiah(0)).toBe('Rp 0');
  });

  it('formats a small amount with a thousands separator', () => {
    expect(formatRupiah(45000)).toBe('Rp 45.000');
  });

  it('formats a large amount with multiple thousands separators', () => {
    expect(formatRupiah(1000000)).toBe('Rp 1.000.000');
  });

  it('rounds a fractional amount to the nearest rupiah', () => {
    expect(formatRupiah(45000.6)).toBe('Rp 45.001');
  });

  it('formats a negative amount with a leading minus before Rp', () => {
    expect(formatRupiah(-45000)).toBe('-Rp 45.000');
  });
});
