import { useEffect } from 'react';
import { PaymentMethod } from '../../../domain/entities/Payment';
import { PaymentCancelUsecase } from '../../../domain/usecases/paymentCancel';
import { usePaymentCancel } from './usePaymentCancel';

export type PaymentCancelSyncTarget = {
  reference: string;
  method: PaymentMethod;
} | null;

export const usePaymentCancelSyncedTo = (
  usecase: PaymentCancelUsecase,
  target: PaymentCancelSyncTarget
) => {
  const binding = usePaymentCancel(usecase);

  useEffect(() => {
    if (!target) return;
    if (
      target.reference === binding.state.reference &&
      target.method === binding.state.method
    ) {
      return;
    }
    binding.dispatch({ type: 'SYNC_PARAMS', ...target });
  }, [
    target?.reference,
    target?.method,
    binding.state.reference,
    binding.state.method,
    binding.dispatch,
  ]);

  return binding;
};
