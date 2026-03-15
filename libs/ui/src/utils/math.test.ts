import { roundToNearest500 } from './math';

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
