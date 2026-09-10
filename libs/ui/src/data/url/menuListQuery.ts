// eslint-disable-next-line @nx/enforce-module-boundaries
import { MenuListQueryRepository } from '../../domain/repositories/menuListQuery';
import { getQueryParam, setQueryParam } from '../../utils/queryParam';

export class UrlMenuListQueryRepository implements MenuListQueryRepository {
  getSelectedProductId = (url?: string): number | null => {
    const productIdQuery = getQueryParam('product', url);
    return productIdQuery ? parseInt(productIdQuery, 10) : null;
  };

  setSelectedProductId: MenuListQueryRepository['setSelectedProductId'] = (
    productId
  ) => {
    setQueryParam('product', productId === null ? null : productId.toString(), {
      history: 'push',
    });
  };
}
