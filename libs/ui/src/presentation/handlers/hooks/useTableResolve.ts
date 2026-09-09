import { TableResolveUsecase } from '../../../domain/usecases/tableResolve';
import { useUsecase } from './useUsecase';

export const useTableResolve = (usecase: TableResolveUsecase) => {
  return useUsecase(usecase);
};
