import { Coupon, CouponForm } from '../../domain/entities';
import { CouponRepository } from '../../domain/repositories/coupon';

export class MockCouponRepository implements CouponRepository {
  coupons: Coupon[] = [
    {
      id: 1,
      code: 'DISCOUNT10',
      type: 'percentage',
      amount: 10,
      createdAt: '2024-03-20T00:00:00.000Z',
    },
    {
      id: 2,
      code: 'FIXED5000',
      type: 'fixed',
      amount: 5000,
      createdAt: '2024-03-21T00:00:00.000Z',
    },
  ];

  private nextId = 3;
  private shouldFail = false;

  setShouldFail(value: boolean) {
    this.shouldFail = value;
  }

  async fetchCouponList(): Promise<Coupon[]> {
    if (this.shouldFail) throw new Error('Failed to fetch coupons');
    return [...this.coupons];
  }

  async fetchCouponById(couponId: number): Promise<Coupon> {
    if (this.shouldFail) throw new Error('Failed to fetch coupon');
    const coupon = this.coupons.find((c) => c.id === couponId);
    if (!coupon) throw new Error('Coupon not found');
    return { ...coupon };
  }

  async deleteCouponById(couponId: number): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to delete coupon');
    this.coupons = this.coupons.filter((c) => c.id !== couponId);
  }

  async createCoupon(formValues: CouponForm): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to create coupon');
    this.coupons.push({
      id: this.nextId++,
      code: formValues.code,
      type: formValues.type,
      amount: formValues.amount,
      createdAt: new Date().toISOString(),
    });
  }

  async updateCoupon(formValues: CouponForm, couponId: number): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to update coupon');
    const idx = this.coupons.findIndex((c) => c.id === couponId);
    if (idx === -1) throw new Error('Coupon not found');
    this.coupons[idx] = {
      ...this.coupons[idx],
      code: formValues.code,
      type: formValues.type,
      amount: formValues.amount,
    };
  }

  reset() {
    this.coupons = [
      {
        id: 1,
        code: 'DISCOUNT10',
        type: 'percentage',
        amount: 10,
        createdAt: '2024-03-20T00:00:00.000Z',
      },
      {
        id: 2,
        code: 'FIXED5000',
        type: 'fixed',
        amount: 5000,
        createdAt: '2024-03-21T00:00:00.000Z',
      },
    ];
    this.nextId = 3;
    this.shouldFail = false;
  }
}
