import { PricingTier } from '../../../domain';
import { calculateSubtotal, formatDuration } from './rentalPricing';

const tiers: PricingTier[] = [
  { upToMinutes: 60, price: 15000 },
  { upToMinutes: 90, price: 20000 },
  { upToMinutes: 120, price: 30000 },
];

describe('calculateSubtotal', () => {
  it('returns 0 when there are no pricing tiers', () => {
    const checkinAt = '2024-01-20T08:00:00.000Z';
    const now = new Date('2024-01-20T08:30:00.000Z');

    expect(calculateSubtotal([], checkinAt, now)).toBe(0);
  });

  it('returns the first tier price when duration is under the first tier', () => {
    const checkinAt = '2024-01-20T08:00:00.000Z';
    const now = new Date('2024-01-20T08:30:00.000Z');

    expect(calculateSubtotal(tiers, checkinAt, now)).toBe(15000);
  });

  it('returns the last tier price when duration is past the last tier', () => {
    const checkinAt = '2024-01-20T08:00:00.000Z';
    const now = new Date('2024-01-20T11:00:00.000Z');

    expect(calculateSubtotal(tiers, checkinAt, now)).toBe(30000);
  });

  it('returns the tier price at the exact boundary', () => {
    const checkinAt = '2024-01-20T08:00:00.000Z';
    const now = new Date('2024-01-20T09:00:00.000Z');

    expect(calculateSubtotal(tiers, checkinAt, now)).toBe(15000);
  });
});

describe('formatDuration', () => {
  it('formats minutes only when under an hour', () => {
    const checkinAt = '2024-01-20T08:00:00.000Z';
    const now = new Date('2024-01-20T08:35:00.000Z');

    expect(formatDuration(checkinAt, now)).toBe('35m');
  });

  it('formats hours only when there are no leftover minutes', () => {
    const checkinAt = '2024-01-20T08:00:00.000Z';
    const now = new Date('2024-01-20T10:00:00.000Z');

    expect(formatDuration(checkinAt, now)).toBe('2h');
  });

  it('formats hours and minutes when both are present', () => {
    const checkinAt = '2024-01-20T08:00:00.000Z';
    const now = new Date('2024-01-20T09:20:00.000Z');

    expect(formatDuration(checkinAt, now)).toBe('1h 20m');
  });
});
