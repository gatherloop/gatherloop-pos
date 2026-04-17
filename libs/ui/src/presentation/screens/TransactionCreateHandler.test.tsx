import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransactionCreateHandler } from './TransactionCreateHandler';
import {
  MockAuthRepository,
  MockCouponRepository,
  MockProductRepository,
  MockTransactionRepository,
  MockVariantRepository,
  MockWalletRepository,
} from '../../data/mock';
import {
  AuthLogoutUsecase,
  CouponListUsecase,
  TransactionCreateUsecase,
  TransactionItemSelectUsecase,
  TransactionPayUsecase,
} from '../../domain';
import { flushPromises } from '../../utils/testUtils';

const mockRouterPush = jest.fn();
jest.mock('solito/router', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn(), back: jest.fn() }),
}));

const mockToastShow = jest.fn();
jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: mockToastShow }),
}));

// usePrinter uses WebSocket — mock to avoid runtime errors
jest.mock('../../utils', () => ({
  ...jest.requireActual('../../utils'),
  usePrinter: () => ({ print: jest.fn().mockResolvedValue(undefined) }),
}));

const createProps = (
  options: {
    productShouldFail?: boolean;
    transactionShouldFail?: boolean;
  } = {}
) => {
  const transactionRepo = new MockTransactionRepository();
  const productRepo = new MockProductRepository();
  const variantRepo = new MockVariantRepository();
  const walletRepo = new MockWalletRepository();
  const couponRepo = new MockCouponRepository();

  if (options.productShouldFail) productRepo.setShouldFail(true);
  if (options.transactionShouldFail) transactionRepo.setShouldFail(true);

  return {
    authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
    transactionCreateUsecase: new TransactionCreateUsecase(transactionRepo),
    transactionItemSelectUsecase: new TransactionItemSelectUsecase(
      productRepo,
      variantRepo,
      { products: [], totalItem: 0 }
    ),
    transactionPayUsecase: new TransactionPayUsecase(transactionRepo, walletRepo, {
      wallets: [],
    }),
    couponListUsecase: new CouponListUsecase(couponRepo, { coupons: [] }),
  };
};

describe('TransactionCreateHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading and data states', () => {
    it('should show product loading state initially', async () => {
      render(<TransactionCreateHandler {...createProps()} />);
      expect(screen.getByText('Fetching Products...')).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should show product list after successful fetch', async () => {
      render(<TransactionCreateHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Product 1' })).toBeTruthy();
      expect(screen.getByRole('heading', { name: 'Product 2' })).toBeTruthy();
    });

    it('should show error state when product fetch fails', async () => {
      render(
        <TransactionCreateHandler {...createProps({ productShouldFail: true })} />
      );

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Products' })).toBeTruthy();
    });
  });

  describe('form fields', () => {
    it('should show customer name input field', async () => {
      render(<TransactionCreateHandler {...createProps()} />);
      expect(screen.getByRole('textbox', { name: 'Customer Name' })).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should show order number input field', async () => {
      render(<TransactionCreateHandler {...createProps()} />);
      expect(screen.getByRole('textbox', { name: 'Order Number' })).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should show submit button', async () => {
      render(<TransactionCreateHandler {...createProps()} />);
      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });
  });

  describe('form validation', () => {
    it('should show error message when customer name is empty on submit', async () => {
      const user = userEvent.setup();
      render(<TransactionCreateHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('String must contain at least 1 character(s)')).toBeTruthy();
    });

    it('should not navigate when form validation fails', async () => {
      const user = userEvent.setup();
      render(<TransactionCreateHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('error banner', () => {
    it('should not show error banner before any submission', async () => {
      render(<TransactionCreateHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByText('Failed to submit. Please try again.')).toBeNull();
    });
  });

  describe('error recovery', () => {
    it('should refetch products when retry button is pressed', async () => {
      const user = userEvent.setup();
      const productRepo = new MockProductRepository();
      productRepo.setShouldFail(true);

      const transactionRepo = new MockTransactionRepository();
      const variantRepo = new MockVariantRepository();
      const walletRepo = new MockWalletRepository();
      const couponRepo = new MockCouponRepository();

      render(
        <TransactionCreateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          transactionCreateUsecase={new TransactionCreateUsecase(transactionRepo)}
          transactionItemSelectUsecase={new TransactionItemSelectUsecase(
            productRepo,
            variantRepo,
            { products: [], totalItem: 0 }
          )}
          transactionPayUsecase={new TransactionPayUsecase(transactionRepo, walletRepo, {
            wallets: [],
          })}
          couponListUsecase={new CouponListUsecase(couponRepo, { coupons: [] })}
        />
      );

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Products' })).toBeTruthy();

      productRepo.setShouldFail(false);

      await user.click(screen.getByRole('button', { name: 'Retry' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Product 1' })).toBeTruthy();
    });
  });
});
