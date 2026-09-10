import { CheckoutUsecase } from '../../../domain/usecases/checkout';
import { useUsecase } from './useUsecase';

export const useCheckout = (usecase: CheckoutUsecase) => {
  return useUsecase(usecase);
};
