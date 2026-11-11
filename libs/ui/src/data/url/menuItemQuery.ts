// eslint-disable-next-line @nx/enforce-module-boundaries
import { MenuItemQueryRepository } from '../../domain/repositories/menuItemQuery';
import { getQueryParam, setQueryParam } from '../../utils/queryParam';

export class UrlMenuItemQueryRepository implements MenuItemQueryRepository {
  getSelectedProductId = (url?: string): number | null => {
    const productIdQuery = getQueryParam('product', url);
    return productIdQuery ? parseInt(productIdQuery, 10) : null;
  };

  setSelectedProductId: MenuItemQueryRepository['setSelectedProductId'] = (
    productId
  ) => {
    setQueryParam('product', productId === null ? null : productId.toString(), {
      history: 'push',
    });
  };
}
