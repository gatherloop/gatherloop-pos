// eslint-disable-next-line @nx/enforce-module-boundaries
import { CartQueryRepository } from '../../domain/repositories/cartQuery';
import { getQueryParam, setQueryParam } from '../../utils/queryParam';

export class UrlCartQueryRepository implements CartQueryRepository {
  getSelectedItemId = (url?: string): number | null => {
    const itemIdQuery = getQueryParam('item', url);
    return itemIdQuery ? parseInt(itemIdQuery, 10) : null;
  };

  setSelectedItemId: CartQueryRepository['setSelectedItemId'] = (itemId) => {
    setQueryParam('item', itemId === null ? null : itemId.toString(), {
      history: 'push',
    });
  };
}
