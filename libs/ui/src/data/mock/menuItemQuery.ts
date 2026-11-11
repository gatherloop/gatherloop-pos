import { MenuItemQueryRepository } from '../../domain/repositories/menuItemQuery';

export class MockMenuItemQueryRepository implements MenuItemQueryRepository {
  getSelectedProductId = (): number | null => null;

  setSelectedProductId = (productId: number | null) => {
    console.log(`Setting selected product id to ${productId}`);
  };
}
