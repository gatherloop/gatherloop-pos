// eslint-disable-next-line @nx/enforce-module-boundaries
import { MenuListQueryRepository } from '../../domain/repositories/menuListQuery';
import { getQueryParam, setQueryParam } from '../../utils/queryParam';

// D6 in docs/trd-order-app-composition-and-ssr.md: `getSelectedProductId`
// takes an optional `url` beyond the port's own signature, the same way
// `UrlProductListQueryRepository.getPage` does — callers that need the
// server-side read (a `getServerSideProps` loader) use this concrete class
// directly rather than the port.
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
