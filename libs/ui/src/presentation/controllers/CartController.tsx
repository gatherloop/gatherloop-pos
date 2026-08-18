import { CartUsecase } from '../../domain/usecases/cart';
import { useController } from './controller';

export const useCartController = (usecase: CartUsecase) => {
  return useController(usecase);
};
