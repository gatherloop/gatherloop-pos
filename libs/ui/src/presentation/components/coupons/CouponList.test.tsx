import React from 'react';
import { render, screen } from '@testing-library/react';
import { CouponList } from './CouponList';
import { Coupon } from '../../../domain';

const baseProps = {
  onRetryButtonPress: jest.fn(),
  onItemPress: jest.fn(),
};

const mockCoupon: Coupon = {
  id: 1,
  code: 'SAVE10',
  type: 'fixed',
  amount: 10000,
  createdAt: '2024-01-01',
};

describe('CouponList', () => {
  it('should render loading view when variant is loading', () => {
    render(<CouponList {...baseProps} variant={{ type: 'loading' }} />);
    expect(screen.getByText('Fetching Coupons...')).toBeTruthy();
  });

  it('should render error view when variant is error', () => {
    render(<CouponList {...baseProps} variant={{ type: 'error' }} />);
    expect(screen.getByText('Failed to Fetch Coupons')).toBeTruthy();
  });

  it('should render empty view when variant is empty', () => {
    render(<CouponList {...baseProps} variant={{ type: 'empty' }} />);
    expect(screen.getByText('Oops, Coupon is Empty')).toBeTruthy();
  });

  it('should render coupon items when variant is loaded', () => {
    const coupons = [
      mockCoupon,
      { ...mockCoupon, id: 2, code: 'DISC20' },
    ];
    render(<CouponList {...baseProps} variant={{ type: 'loaded', coupons }} />);
    expect(screen.getByText('SAVE10')).toBeTruthy();
    expect(screen.getByText('DISC20')).toBeTruthy();
  });
});
