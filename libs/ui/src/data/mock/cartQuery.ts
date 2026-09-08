import { CartQueryRepository } from '../../domain/repositories/cartQuery';

export class MockCartQueryRepository implements CartQueryRepository {
  getSelectedItemId = (): number | null => null;

  setSelectedItemId = (itemId: number | null) => {
    console.log(`Setting selected item id to ${itemId}`);
  };
}
