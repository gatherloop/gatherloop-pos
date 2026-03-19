import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CouponUpdateHandler } from './CouponUpdateHandler';
import { MockAuthRepository, MockCouponRepository } from '../../data/mock';
import { AuthLogoutUsecase, CouponUpdateUsecase } from '../../domain';
import { flushPromises } from '../../utils/testUtils';

const mockRouterPush = jest.fn();
jest.mock('solito/router', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn(), back: jest.fn() }),
}));

const mockToastShow = jest.fn();
jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: mockToastShow }),
}));

const createProps = (
  options: {
    couponId?: number;
    shouldFail?: boolean;
    preloaded?: boolean;
  } = {}
) => {
  const couponId = options.couponId ?? 1;
  const couponRepo = new MockCouponRepository();
  if (options.shouldFail) couponRepo.setShouldFail(true);

  const preloadedCoupon = options.preloaded
    ? couponRepo.coupons.find((c) => c.id === couponId) ?? null
    : null;

  return {
    authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
    couponUpdateUsecase: new CouponUpdateUsecase(couponRepo, {
      couponId,
      coupon: preloadedCoupon,
    }),
  };
};

describe('CouponUpdateHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading and data states', () => {
    it('should show loading state while fetching coupon', () => {
      render(<CouponUpdateHandler {...createProps()} />);
      expect(screen.getByText('Fetching Coupon...')).toBeTruthy();
    });

    it('should show the form after coupon data loads', async () => {
      render(<CouponUpdateHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });

    it('should render pre-filled form when coupon is preloaded', () => {
      render(<CouponUpdateHandler {...createProps({ preloaded: true })} />);
      expect(screen.getByDisplayValue('DISCOUNT10')).toBeTruthy();
    });

    it('should show error state when coupon fetch fails', async () => {
      render(<CouponUpdateHandler {...createProps({ shouldFail: true })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Coupon' })).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate to "/coupons" after successful update', async () => {
      const user = userEvent.setup();
      render(<CouponUpdateHandler {...createProps({ preloaded: true })} />);

      const codeInput = screen.getByRole('textbox', { name: 'Code' });
      await user.clear(codeInput);
      await user.type(codeInput, 'UPDATEDCODE');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).toHaveBeenCalledWith('/coupons');
    });

    it('should not navigate when update fails', async () => {
      const user = userEvent.setup();
      const couponRepo = new MockCouponRepository();
      const preloadedCoupon = couponRepo.coupons[0];
      const couponUpdateUsecase = new CouponUpdateUsecase(couponRepo, {
        couponId: preloadedCoupon.id,
        coupon: preloadedCoupon,
      });
      couponRepo.setShouldFail(true);

      render(
        <CouponUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          couponUpdateUsecase={couponUpdateUsecase}
        />
      );

      const codeInput = screen.getByRole('textbox', { name: 'Code' });
      await user.clear(codeInput);
      await user.type(codeInput, 'UPDATEDCODE');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it('should not navigate without user interaction', async () => {
      render(<CouponUpdateHandler {...createProps({ preloaded: true })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('should show error message when code field is empty and submit is clicked', async () => {
      const user = userEvent.setup();
      render(<CouponUpdateHandler {...createProps({ preloaded: true })} />);

      const codeInput = screen.getByRole('textbox', { name: 'Code' });
      await user.clear(codeInput);
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('String must contain at least 1 character(s)')).toBeTruthy();
    });
  });

  describe('toast notifications', () => {
    it('should show toast error message when update fails', async () => {
      const user = userEvent.setup();
      const couponRepo = new MockCouponRepository();
      const preloadedCoupon = couponRepo.coupons[0];
      const couponUpdateUsecase = new CouponUpdateUsecase(couponRepo, {
        couponId: preloadedCoupon.id,
        coupon: preloadedCoupon,
      });
      couponRepo.setShouldFail(true);

      render(
        <CouponUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          couponUpdateUsecase={couponUpdateUsecase}
        />
      );

      const codeInput = screen.getByRole('textbox', { name: 'Code' });
      await user.clear(codeInput);
      await user.type(codeInput, 'UPDATEDCODE');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith('Update Coupon Error');
    });
  });

  describe('error recovery', () => {
    it('should refetch coupon when retry button is pressed after error', async () => {
      const user = userEvent.setup();
      const couponRepo = new MockCouponRepository();
      couponRepo.setShouldFail(true);

      render(
        <CouponUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          couponUpdateUsecase={new CouponUpdateUsecase(couponRepo, {
            couponId: 1,
            coupon: null,
          })}
        />
      );

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Coupon' })).toBeTruthy();

      couponRepo.setShouldFail(false);

      await user.click(screen.getByRole('button', { name: 'Retry' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });
  });
});
