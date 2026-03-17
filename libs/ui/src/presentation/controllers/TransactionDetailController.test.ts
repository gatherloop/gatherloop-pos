import { renderHook, act } from '@testing-library/react';
import { useTransactionDetailController } from './TransactionDetailController';
import { MockTransactionRepository } from '../../data/mock';
import { TransactionDetailUsecase } from '../../domain';

const createUsecase = (withTransaction = false) => {
  const transactionRepo = new MockTransactionRepository();
  const transaction = withTransaction ? transactionRepo.transactions[0] : null;
  return {
    usecase: new TransactionDetailUsecase(transactionRepo, {
      transactionId: 1,
      transaction,
    }),
    transactionRepo,
  };
};

describe('useTransactionDetailController', () => {
  it('should return state and dispatch', () => {
    const { usecase } = createUsecase();
    const { result } = renderHook(() =>
      useTransactionDetailController(usecase)
    );

    expect(result.current.state).toBeDefined();
    expect(typeof result.current.dispatch).toBe('function');
  });

  it('should start in loading state when no transaction preloaded', () => {
    const { usecase } = createUsecase();
    const { result } = renderHook(() =>
      useTransactionDetailController(usecase)
    );

    expect(result.current.state.type).toBe('loading');
  });

  it('should start in loaded state when transaction is preloaded', () => {
    const { usecase } = createUsecase(true);
    const { result } = renderHook(() =>
      useTransactionDetailController(usecase)
    );

    expect(result.current.state.type).toBe('loaded');
  });

  it('should transition to loaded state after successful fetch', async () => {
    const { usecase } = createUsecase();
    const { result } = renderHook(() =>
      useTransactionDetailController(usecase)
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.state.type).toBe('loaded');
  });

  it('should transition to error state when fetch fails', async () => {
    const { usecase, transactionRepo } = createUsecase();
    transactionRepo.setShouldFail(true);

    const { result } = renderHook(() =>
      useTransactionDetailController(usecase)
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.state.type).toBe('error');
  });

  it('should expose derived transaction fields', () => {
    const { usecase } = createUsecase(true);
    const { result } = renderHook(() =>
      useTransactionDetailController(usecase)
    );

    expect(result.current.id).toBe(1);
    expect(result.current.name).toBe('Transaction 1');
    expect(result.current.orderNumber).toBe(1);
    expect(result.current.total).toBe(100000);
  });

  it('should expose default values when transaction is null', () => {
    const { usecase } = createUsecase();
    const { result } = renderHook(() =>
      useTransactionDetailController(usecase)
    );

    expect(result.current.id).toBe(-1);
    expect(result.current.name).toBe('');
    expect(result.current.orderNumber).toBe(0);
    expect(result.current.total).toBe(0);
    expect(result.current.transactionItems).toEqual([]);
    expect(result.current.transactionCoupons).toEqual([]);
    expect(result.current.paidAt).toBeUndefined();
  });

  it('should expose populated transaction fields after fetch', async () => {
    const { usecase, transactionRepo } = createUsecase();
    const { result } = renderHook(() =>
      useTransactionDetailController(usecase)
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const fetchedTransaction = transactionRepo.transactions[0];
    expect(result.current.id).toBe(fetchedTransaction.id);
    expect(result.current.name).toBe(fetchedTransaction.name);
    expect(result.current.total).toBe(fetchedTransaction.total);
  });
});
