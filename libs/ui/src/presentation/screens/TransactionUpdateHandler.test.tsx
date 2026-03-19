import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransactionUpdateHandler } from './TransactionUpdateHandler';
import {
  MockAuthRepository,
  MockCouponRepository,
  MockProductRepository,
  MockTransactionRepository,
  MockVariantRepository,
} from '../../data/mock';
import {
  AuthLogoutUsecase,
  CouponListUsecase,
  TransactionItemSelectUsecase,
  TransactionUpdateUsecase,
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

const createProps = (
  options: {
    transactionId?: number;
    preloaded?: boolean;
    transactionShouldFail?: boolean;
    productShouldFail?: boolean;
  } = {}
) => {
  const transactionId = options.transactionId ?? 1;
  const transactionRepo = new MockTransactionRepository();
  const productRepo = new MockProductRepository();
  const variantRepo = new MockVariantRepository();
  const couponRepo = new MockCouponRepository();

  if (options.transactionShouldFail) transactionRepo.setShouldFail(true);
  if (options.productShouldFail) productRepo.setShouldFail(true);

  const preloadedTransaction = options.preloaded
    ? transactionRepo.transactions.find((t) => t.id === transactionId) ?? null
    : null;

  return {
    authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
    transactionUpdateUsecase: new TransactionUpdateUsecase(transactionRepo, {
      transactionId,
      transaction: preloadedTransaction,
    }),
    transactionItemSelectUsecase: new TransactionItemSelectUsecase(
      productRepo,
      variantRepo,
      { products: [], totalItem: 0 }
    ),
    couponListUsecase: new CouponListUsecase(couponRepo, { coupons: [] }),
  };
};

describe('TransactionUpdateHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading and data states', () => {
    it('should show submit button immediately', () => {
      render(<TransactionUpdateHandler {...createProps()} />);
      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });

    it('should show product loading state initially', () => {
      render(<TransactionUpdateHandler {...createProps()} />);
      expect(screen.getByText('Fetching Products...')).toBeTruthy();
    });

    it('should show product list after successful fetch', async () => {
      render(<TransactionUpdateHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Product 1' })).toBeTruthy();
    });

    it('should render pre-filled form when transaction is preloaded', () => {
      render(<TransactionUpdateHandler {...createProps({ preloaded: true })} />);
      expect(screen.getByDisplayValue('Transaction 1')).toBeTruthy();
    });
  });

  describe('form fields', () => {
    it('should show customer name input field', () => {
      render(<TransactionUpdateHandler {...createProps()} />);
      expect(screen.getByRole('textbox', { name: 'Customer Name' })).toBeTruthy();
    });

    it('should show order number input field', () => {
      render(<TransactionUpdateHandler {...createProps()} />);
      expect(screen.getByRole('textbox', { name: 'Order Number' })).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate to "/transactions" after successful update', async () => {
      const user = userEvent.setup();
      render(<TransactionUpdateHandler {...createProps({ preloaded: true })} />);

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).toHaveBeenCalledWith('/transactions');
    });

    it('should not navigate without user interaction', async () => {
      render(<TransactionUpdateHandler {...createProps({ preloaded: true })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it('should not navigate when update fails', async () => {
      const user = userEvent.setup();
      const transactionRepo = new MockTransactionRepository();
      const preloadedTransaction = transactionRepo.transactions[0];
      transactionRepo.setShouldFail(true);

      render(
        <TransactionUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          transactionUpdateUsecase={new TransactionUpdateUsecase(transactionRepo, {
            transactionId: preloadedTransaction.id,
            transaction: preloadedTransaction,
          })}
          transactionItemSelectUsecase={new TransactionItemSelectUsecase(
            new MockProductRepository(),
            new MockVariantRepository(),
            { products: [], totalItem: 0 }
          )}
          couponListUsecase={new CouponListUsecase(
            new MockCouponRepository(),
            { coupons: [] }
          )}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('toast notifications', () => {
    it('should show success toast after successful update', async () => {
      const user = userEvent.setup();
      render(<TransactionUpdateHandler {...createProps({ preloaded: true })} />);

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith('Update Transaction Success');
    });

    it('should show error toast when update fails', async () => {
      const user = userEvent.setup();
      const transactionRepo = new MockTransactionRepository();
      const preloadedTransaction = transactionRepo.transactions[0];
      transactionRepo.setShouldFail(true);

      render(
        <TransactionUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          transactionUpdateUsecase={new TransactionUpdateUsecase(transactionRepo, {
            transactionId: preloadedTransaction.id,
            transaction: preloadedTransaction,
          })}
          transactionItemSelectUsecase={new TransactionItemSelectUsecase(
            new MockProductRepository(),
            new MockVariantRepository(),
            { products: [], totalItem: 0 }
          )}
          couponListUsecase={new CouponListUsecase(
            new MockCouponRepository(),
            { coupons: [] }
          )}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith('Update Transaction Error');
    });
  });

  describe('product error recovery', () => {
    it('should refetch products when retry button is pressed', async () => {
      const user = userEvent.setup();
      const productRepo = new MockProductRepository();
      productRepo.setShouldFail(true);

      render(
        <TransactionUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          transactionUpdateUsecase={new TransactionUpdateUsecase(
            new MockTransactionRepository(),
            { transactionId: 1, transaction: null }
          )}
          transactionItemSelectUsecase={new TransactionItemSelectUsecase(
            productRepo,
            new MockVariantRepository(),
            { products: [], totalItem: 0 }
          )}
          couponListUsecase={new CouponListUsecase(
            new MockCouponRepository(),
            { coupons: [] }
          )}
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
