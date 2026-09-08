import { MenuListQueryRepository } from '../../domain/repositories/menuListQuery';

export class MockMenuListQueryRepository implements MenuListQueryRepository {
  getSelectedProductId = (): number | null => null;

  setSelectedProductId = (productId: number | null) => {
    console.log(`Setting selected product id to ${productId}`);
  };
}
