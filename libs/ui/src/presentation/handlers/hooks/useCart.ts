import { CartUsecase } from '../../../domain/usecases/cart';
import { useUsecase } from './useUsecase';

export const useCart = (usecase: CartUsecase) => {
  return useUsecase(usecase);
};
