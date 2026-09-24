import { PaymentCancelUsecase } from '../../../domain/usecases/paymentCancel';
import { useUsecase } from './useUsecase';

export const usePaymentCancel = (usecase: PaymentCancelUsecase) => {
  return useUsecase(usecase);
};
