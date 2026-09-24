import { useEffect, useRef } from 'react';
import { PaymentCancelUsecase } from '../../../domain/usecases/paymentCancel';
import { useUsecase } from './useUsecase';

export const usePaymentCancel = (usecase: PaymentCancelUsecase) => {
  const binding = useUsecase(usecase);
  const lastParamsRef = useRef(usecase.params);

  // useReducer's initial state is seeded once, from whichever
  // PaymentCancelUsecase instance was mounted first — often built before the
  // menu/cart's pendingPayment is known. This keeps the running state's
  // reference/method in sync whenever the caller reconstructs the usecase
  // with newer params.
  useEffect(() => {
    if (
      lastParamsRef.current.reference !== usecase.params.reference ||
      lastParamsRef.current.method !== usecase.params.method
    ) {
      lastParamsRef.current = usecase.params;
      binding.dispatch({
        type: 'SYNC_PARAMS',
        reference: usecase.params.reference,
        method: usecase.params.method,
      });
    }
  }, [usecase.params.reference, usecase.params.method, binding.dispatch]);

  return binding;
};
