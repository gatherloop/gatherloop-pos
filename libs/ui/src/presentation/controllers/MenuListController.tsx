import { MenuListUsecase } from '../../domain/usecases/menuList';
import { useController } from './controller';

export const useMenuListController = (usecase: MenuListUsecase) => {
  return useController(usecase);
};
