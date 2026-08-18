import { TableResolveUsecase } from '../../domain/usecases/tableResolve';
import { useController } from './controller';

export const useTableResolveController = (usecase: TableResolveUsecase) => {
  return useController(usecase);
};
