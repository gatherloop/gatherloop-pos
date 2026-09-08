import { QueryClient } from '@tanstack/react-query';
// Deep imports, not the root barrels (D20): those also re-export every POS
// composition root, which would bloat the customer bundle with the POS (D6).
import { ApiCartRepository } from '../../data/api/cart';
import { ApiMenuRepository } from '../../data/api/menu';
import { ApiPublicTableRepository } from '../../data/api/publicTable';
import { CookieSessionRepository } from '../../data/session/CookieSessionRepository';
import { UrlMenuListQueryRepository } from '../../data/url/menuListQuery';
import { CartUsecase } from '../../domain/usecases/cart';
import { MenuItemDetailUsecase } from '../../domain/usecases/menuItemDetail';
import { MenuListUsecase } from '../../domain/usecases/menuList';
import { TableResolveUsecase } from '../../domain/usecases/tableResolve';
import { MenuListHandler } from '../../presentation/screens/order/MenuListHandler';

export type MenuListProps = {
  sessionId: string;
  code: string;
};

// Composition root for the menu screen (FR-5/FR-7 in
// docs/prd-table-ordering.md). Per D9 in
// docs/trd-order-app-composition-and-ssr.md this now wires up the table
// shell and the item sheet too, in addition to the menu list and the cart —
// the whole vertical slice `/t/{code}` renders, structurally identical to
// `app/pos/ProductList.tsx` (§3.5).
export function MenuList({ sessionId, code }: MenuListProps) {
  const client = new QueryClient();
  const sessionRepository = new CookieSessionRepository(sessionId);
  const menuRepository = new ApiMenuRepository(client);
  const publicTableRepository = new ApiPublicTableRepository();
  const cartRepository = new ApiCartRepository(sessionRepository);
  const menuListQueryRepository = new UrlMenuListQueryRepository();

  const tableResolveUsecase = new TableResolveUsecase(publicTableRepository, {
    code,
  });
  const menuListUsecase = new MenuListUsecase(
    menuRepository,
    menuListQueryRepository,
    { products: [], categories: [] }
  );
  // Always starts unselected — `MenuListHandler`'s effect is the sole
  // trigger for `SELECT_PRODUCT`, covering both a fresh click and a
  // `?product=` deep link already present at mount via `menuListUsecase`'s
  // own initial state (D6).
  const menuItemDetailUsecase = new MenuItemDetailUsecase(menuRepository, {
    productId: null,
  });
  const cartUsecase = new CartUsecase(cartRepository);

  return (
    <MenuListHandler
      tableResolveUsecase={tableResolveUsecase}
      menuListUsecase={menuListUsecase}
      menuItemDetailUsecase={menuItemDetailUsecase}
      cartUsecase={cartUsecase}
      sessionRepository={sessionRepository}
      tableCode={code}
    />
  );
}
