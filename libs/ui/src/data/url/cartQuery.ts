// eslint-disable-next-line @nx/enforce-module-boundaries
import { CartQueryRepository } from '../../domain/repositories/cartQuery';
import { getQueryParam, setQueryParam } from '../../utils/queryParam';

// D6 in docs/trd-order-app-composition-and-ssr.md: the same shape as
// `UrlMenuListQueryRepository`, one param (`item`) for the cart route
// instead of `product` for the menu route.
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
