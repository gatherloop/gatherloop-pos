import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CouponListHandler } from './CouponListHandler';
import { MockAuthRepository, MockCouponRepository } from '../../data/mock';
import {
  AuthLogoutUsecase,
  CouponDeleteUsecase,
  CouponListUsecase,
} from '../../domain';
import { flushPromises } from '../../utils/testUtils';

const mockRouterPush = jest.fn();
jest.mock('solito/router', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: jest.fn() }),
}));

const createProps = (
  options: {
    couponRepo?: MockCouponRepository;
    authRepo?: MockAuthRepository;
  } = {}
) => {
  const couponRepo = options.couponRepo ?? new MockCouponRepository();
  const authRepo = options.authRepo ?? new MockAuthRepository();
  return {
    authLogoutUsecase: new AuthLogoutUsecase(authRepo),
    couponListUsecase: new CouponListUsecase(couponRepo, { coupons: [] }),
    couponDeleteUsecase: new CouponDeleteUsecase(couponRepo),
  };
};

describe('CouponListHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading and data states', () => {
    it('should show loading state initially', async () => {
      render(<CouponListHandler {...createProps()} />);
      expect(screen.getByText('Fetching Coupons...')).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should show coupon list after successful fetch', async () => {
      render(<CouponListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'DISCOUNT10' })).toBeTruthy();
      expect(screen.getByRole('heading', { name: 'FIXED5000' })).toBeTruthy();
    });

    it('should show error state when fetch fails', async () => {
      const couponRepo = new MockCouponRepository();
      couponRepo.setShouldFail(true);

      render(<CouponListHandler {...createProps({ couponRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Coupons' })).toBeTruthy();
    });

    it('should show empty state when no coupons exist', async () => {
      const couponRepo = new MockCouponRepository();
      couponRepo.coupons = [];

      render(<CouponListHandler {...createProps({ couponRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Oops, Coupon is Empty' })).toBeTruthy();
    });
  });

  describe('delete modal', () => {
    it('should not show delete modal initially', async () => {
      render(<CouponListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByRole('heading', { name: 'Delete Coupon ?' })).toBeNull();
    });

    it('should show delete modal when delete menu is pressed', async () => {
      const user = userEvent.setup();
      render(<CouponListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);

      expect(screen.getByRole('heading', { name: 'Delete Coupon ?' })).toBeTruthy();
    });

    it('should hide delete modal when cancel is pressed', async () => {
      const user = userEvent.setup();
      render(<CouponListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);
      expect(screen.getByRole('heading', { name: 'Delete Coupon ?' })).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'No' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByRole('heading', { name: 'Delete Coupon ?' })).toBeNull();
    });

    it('should refetch coupon list after successful delete', async () => {
      const user = userEvent.setup();
      const couponRepo = new MockCouponRepository();
      render(<CouponListHandler {...createProps({ couponRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'DISCOUNT10' })).toBeTruthy();

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);
      expect(screen.getByRole('heading', { name: 'Delete Coupon ?' })).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'Yes' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByRole('heading', { name: 'Delete Coupon ?' })).toBeNull();
      expect(screen.getByRole('heading', { name: 'FIXED5000' })).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate to coupon edit page when edit menu is pressed', async () => {
      const user = userEvent.setup();
      render(<CouponListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const editMenuItems = screen.getAllByRole('button', { name: 'Edit' });
      await user.click(editMenuItems[0]);

      expect(mockRouterPush).toHaveBeenCalledWith('/coupons/1');
    });

    it('should navigate to coupon page when item is pressed', async () => {
      const user = userEvent.setup();
      render(<CouponListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      await user.click(screen.getByRole('heading', { name: 'DISCOUNT10' }));

      expect(mockRouterPush).toHaveBeenCalledWith('/coupons/1');
    });
  });

  describe('error recovery', () => {
    it('should refetch coupons when retry button is pressed', async () => {
      const user = userEvent.setup();
      const couponRepo = new MockCouponRepository();
      couponRepo.setShouldFail(true);

      render(<CouponListHandler {...createProps({ couponRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Coupons' })).toBeTruthy();

      couponRepo.setShouldFail(false);

      await user.click(screen.getByRole('button', { name: 'Retry' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'DISCOUNT10' })).toBeTruthy();
    });
  });
});
