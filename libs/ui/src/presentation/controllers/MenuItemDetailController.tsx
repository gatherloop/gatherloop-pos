import { MenuItemDetailUsecase } from '../../domain/usecases/menuItemDetail';
import { useController } from './controller';

export const useMenuItemDetailController = (
  usecase: MenuItemDetailUsecase
) => {
  return useController(usecase);
};
