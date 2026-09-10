import { OrderStatusUsecase } from '../../../domain/usecases/orderStatus';
import { useUsecase } from './useUsecase';

export const useOrderStatus = (usecase: OrderStatusUsecase) => {
  return useUsecase(usecase);
};
