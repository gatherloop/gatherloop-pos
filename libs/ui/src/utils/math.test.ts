import { applyCouponToBase, roundToNearest500 } from './math';

describe('roundToNearest500', () => {
  it('rounds 0 to 0', () => {
    expect(roundToNearest500(0)).toBe(0);
  });

  it('rounds 250 to 500', () => {
    expect(roundToNearest500(250)).toBe(500);
  });

  it('rounds 749 to 500', () => {
    expect(roundToNearest500(749)).toBe(500);
  });

  it('rounds 750 to 1000', () => {
    expect(roundToNearest500(750)).toBe(1000);
  });

  it('rounds 1000 to 1000', () => {
    expect(roundToNearest500(1000)).toBe(1000);
  });

  it('rounds negative numbers', () => {
    expect(roundToNearest500(-250) + 0).toBe(0);
  });
});

describe('applyCouponToBase', () => {
  // PRD FR-4 acceptance table
  it('FREE 1 HOUR (fixed 15000) on 30000 base discounts 15000', () => {
    expect(applyCouponToBase(30000, { type: 'fixed', amount: 15000 })).toBe(15000);
  });

  it('FREE 1 HOUR (fixed 15000) on 45000 base discounts 15000', () => {
    expect(applyCouponToBase(45000, { type: 'fixed', amount: 15000 })).toBe(15000);
  });

  it('FREE 2 HOUR (fixed 30000) on 45000 base discounts 30000', () => {
    expect(applyCouponToBase(45000, { type: 'fixed', amount: 30000 })).toBe(30000);
  });

  it('FREE 2 HOUR (fixed 30000) on 15000 base clamps to 15000 (D3)', () => {
    expect(applyCouponToBase(15000, { type: 'fixed', amount: 30000 })).toBe(15000);
  });

  it('STUDENT (percentage 40) on 30000 base discounts 12000', () => {
    expect(applyCouponToBase(30000, { type: 'percentage', amount: 40 })).toBe(12000);
  });

  it('STUDENT (percentage 40) on 20000 base discounts 8000', () => {
    expect(applyCouponToBase(20000, { type: 'percentage', amount: 40 })).toBe(8000);
  });

  it('fixed exactly equal to base discounts the full base', () => {
    expect(applyCouponToBase(15000, { type: 'fixed', amount: 15000 })).toBe(15000);
  });
});
