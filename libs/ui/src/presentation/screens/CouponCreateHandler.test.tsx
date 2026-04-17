import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CouponCreateHandler } from './CouponCreateHandler';
import { MockAuthRepository, MockCouponRepository } from '../../data/mock';
import { AuthLogoutUsecase, CouponCreateUsecase } from '../../domain';
import { flushPromises } from '../../utils/testUtils';

const mockRouterPush = jest.fn();
jest.mock('solito/router', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn(), back: jest.fn() }),
}));

const mockToastShow = jest.fn();
jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: mockToastShow }),
}));

const createProps = (options: { shouldFail?: boolean } = {}) => {
  const couponRepo = new MockCouponRepository();
  if (options.shouldFail) couponRepo.setShouldFail(true);
  return {
    authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
    couponCreateUsecase: new CouponCreateUsecase(couponRepo),
  };
};

describe('CouponCreateHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('form rendering', () => {
    it('should render the create form in loaded state', () => {
      render(<CouponCreateHandler {...createProps()} />);
      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });

    it('should render the code input field', () => {
      render(<CouponCreateHandler {...createProps()} />);
      expect(screen.getByRole('textbox', { name: 'Code' })).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate to "/coupons" after successful creation', async () => {
      const user = userEvent.setup();
      render(<CouponCreateHandler {...createProps()} />);

      await user.type(screen.getByRole('textbox', { name: 'Code' }), 'NEWCODE');
      await user.type(screen.getByRole('textbox', { name: 'Amount' }), '1000');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).toHaveBeenCalledWith('/coupons');
    });

    it('should not navigate when creation fails', async () => {
      const user = userEvent.setup();
      render(<CouponCreateHandler {...createProps({ shouldFail: true })} />);

      await user.type(screen.getByRole('textbox', { name: 'Code' }), 'NEWCODE');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it('should not navigate when code field is empty (validation fails)', async () => {
      const user = userEvent.setup();
      render(<CouponCreateHandler {...createProps()} />);

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('should show error message when code field is empty and submit is clicked', async () => {
      const user = userEvent.setup();
      render(<CouponCreateHandler {...createProps()} />);

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('String must contain at least 1 character(s)')).toBeTruthy();
    });
  });

  describe('toast notifications', () => {
    it('should show toast error message when creation fails', async () => {
      const user = userEvent.setup();
      render(<CouponCreateHandler {...createProps({ shouldFail: true })} />);

      await user.type(screen.getByRole('textbox', { name: 'Code' }), 'NEWCODE');
      await user.type(screen.getByRole('textbox', { name: 'Amount' }), '1000');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith('Create Coupon Error');
    });
  });

  describe('error banner', () => {
    it('should show error banner when creation fails', async () => {
      const user = userEvent.setup();
      render(<CouponCreateHandler {...createProps({ shouldFail: true })} />);

      await user.type(screen.getByRole('textbox', { name: 'Code' }), 'NEWCODE');
      await user.type(screen.getByRole('textbox', { name: 'Amount' }), '1000');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('Failed to submit. Please try again.')).toBeTruthy();
    });

    it('should not show error banner before any submission', () => {
      render(<CouponCreateHandler {...createProps()} />);
      expect(screen.queryByText('Failed to submit. Please try again.')).toBeNull();
    });
  });
});
