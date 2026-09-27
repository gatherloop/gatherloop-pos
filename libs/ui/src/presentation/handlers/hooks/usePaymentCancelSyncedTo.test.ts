import { renderHook } from '@testing-library/react';
import { MockPaymentRepository } from '../../../data/mock';
import { PaymentCancelUsecase } from '../../../domain/usecases/paymentCancel';
import {
  PaymentCancelSyncTarget,
  usePaymentCancelSyncedTo,
} from './usePaymentCancelSyncedTo';

describe('usePaymentCancelSyncedTo', () => {
  it('does not sync when no target is known yet', () => {
    const usecase = new PaymentCancelUsecase(new MockPaymentRepository(), {
      reference: '',
      method: 'qris',
    });
    const getNextStateSpy = jest.spyOn(usecase, 'getNextState');

    const { result } = renderHook(() =>
      usePaymentCancelSyncedTo(usecase, null)
    );

    expect(getNextStateSpy).not.toHaveBeenCalled();
    expect(result.current.state.reference).toBe('');
    expect(result.current.state.method).toBe('qris');
  });

  it('syncs once a target arrives, and does not re-dispatch on an identical rerender', () => {
    const usecase = new PaymentCancelUsecase(new MockPaymentRepository(), {
      reference: '',
      method: 'qris',
    });
    const getNextStateSpy = jest.spyOn(usecase, 'getNextState');

    const { result, rerender } = renderHook<
      ReturnType<typeof usePaymentCancelSyncedTo>,
      { target: PaymentCancelSyncTarget }
    >(({ target }) => usePaymentCancelSyncedTo(usecase, target), {
      initialProps: { target: null },
    });

    rerender({ target: { reference: 'ORDER-1', method: 'qris' } });
    expect(getNextStateSpy).toHaveBeenCalledTimes(1);
    expect(result.current.state.reference).toBe('ORDER-1');

    rerender({ target: { reference: 'ORDER-1', method: 'qris' } });
    expect(getNextStateSpy).toHaveBeenCalledTimes(1);
  });

  it('re-syncs when a second, different target replaces the first', () => {
    const usecase = new PaymentCancelUsecase(new MockPaymentRepository(), {
      reference: '',
      method: 'qris',
    });
    const getNextStateSpy = jest.spyOn(usecase, 'getNextState');

    const { result, rerender } = renderHook<
      ReturnType<typeof usePaymentCancelSyncedTo>,
      { target: PaymentCancelSyncTarget }
    >(({ target }) => usePaymentCancelSyncedTo(usecase, target), {
      initialProps: { target: { reference: 'ORDER-1', method: 'qris' } },
    });
    expect(getNextStateSpy).toHaveBeenCalledTimes(1);

    rerender({ target: { reference: 'ORDER-2', method: 'cash' } });
    expect(getNextStateSpy).toHaveBeenCalledTimes(2);
    expect(result.current.state.reference).toBe('ORDER-2');
    expect(result.current.state.method).toBe('cash');
  });

  it('does not sync when the target already matches the running state', () => {
    const usecase = new PaymentCancelUsecase(new MockPaymentRepository(), {
      reference: 'ORDER-1',
      method: 'qris',
    });
    const getNextStateSpy = jest.spyOn(usecase, 'getNextState');

    renderHook(() =>
      usePaymentCancelSyncedTo(usecase, {
        reference: 'ORDER-1',
        method: 'qris',
      })
    );

    expect(getNextStateSpy).not.toHaveBeenCalled();
  });
});
