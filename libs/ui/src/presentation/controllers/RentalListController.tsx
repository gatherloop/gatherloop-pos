import { RentalListUsecase } from '../../domain';
import { useController } from './controller';

export const useRentalListController = (usecase: RentalListUsecase) => {
  const { state, dispatch } = useController(usecase);
  return {
    state,
    dispatch,
  };
};
