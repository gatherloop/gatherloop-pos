import { CalculationListUsecase } from '../../domain';
import { useController } from './controller';

export const useCalculationListController = (
  usecase: CalculationListUsecase
) => {
  const { state, dispatch } = useController(usecase);
  return {
    state,
    dispatch,
  };
};
