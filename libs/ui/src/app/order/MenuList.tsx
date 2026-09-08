import { QueryClient } from '@tanstack/react-query';
// Deep imports, not the root barrels (D20): those also re-export every POS
// composition root, which would bloat the customer bundle with the POS (D6).
import { ApiCartRepository } from '../../data/api/cart';
import { ApiMenuRepository } from '../../data/api/menu';
import { ApiPublicTableRepository } from '../../data/api/publicTable';
import { CookieSessionRepository } from '../../data/session/CookieSessionRepository';
import { UrlCartQueryRepository } from '../../data/url/cartQuery';
import { UrlMenuListQueryRepository } from '../../data/url/menuListQuery';
import { Category } from '../../domain/entities/Category';
import { Product } from '../../domain/entities/Product';
import { PublicTable } from '../../domain/entities/PublicTable';
import { Variant } from '../../domain/entities/Variant';
import { CartUsecase } from '../../domain/usecases/cart';
import { MenuItemDetailUsecase } from '../../domain/usecases/menuItemDetail';
import { MenuListUsecase } from '../../domain/usecases/menuList';
import { TableResolveUsecase } from '../../domain/usecases/tableResolve';
import { MenuListHandler } from '../../presentation/screens/order/MenuListHandler';

export type MenuListProps = {
  sessionId: string;
  code: string;
  // P6 in docs/trd-order-app-composition-and-ssr.md: the page's
  // getServerSideProps already resolved the table and fetched the menu, so
  // the screen renders with real data on the first response instead of a
  // skeleton (§3.4). `table` follows `TableResolveParams`'s own
  // undefined/null/`PublicTable` distinction (§2.4). `selectedProductId`
  // seeds both `menuListUsecase` (the URL is the source of truth, D6) and
  // `menuItemDetailUsecase` below, so a `?product=` deep link's sheet also
  // needs no client fetch (D6).
  table?: PublicTable | null;
  products: Product[];
  categories: Category[];
  variants: Variant[];
  selectedProductId: number | null;
};

// Composition root for the menu screen (FR-5/FR-7 in
// docs/prd-table-ordering.md). Per D9 in
// docs/trd-order-app-composition-and-ssr.md this now wires up the table
// shell and the item sheet too, in addition to the menu list and the cart —
// the whole vertical slice `/t/{code}` renders, structurally identical to
// `app/pos/ProductList.tsx` (§3.5).
export function MenuList({
  sessionId,
  code,
  table,
  products,
  categories,
  variants,
  selectedProductId,
}: MenuListProps) {
  const client = new QueryClient();
  const sessionRepository = new CookieSessionRepository(sessionId);
  const menuRepository = new ApiMenuRepository(client);
  const publicTableRepository = new ApiPublicTableRepository();
  const cartRepository = new ApiCartRepository(sessionRepository);
  const menuListQueryRepository = new UrlMenuListQueryRepository();

  const tableResolveUsecase = new TableResolveUsecase(publicTableRepository, {
    code,
    table,
  });
  const menuListUsecase = new MenuListUsecase(
    menuRepository,
    menuListQueryRepository,
    { products, categories, variants, selectedProductId }
  );
  // Seeded with the already-fetched product (D6/§2.4) when the URL selected
  // one at request time, so a `?product=` deep link's sheet renders with no
  // fetch on the very first response. `MenuListHandler`'s effect still
  // fires SELECT_PRODUCT on mount for a fresh client-side click or a
  // selection change — this seeding only covers the initial render.
  const selectedProduct =
    selectedProductId !== null
      ? products.find((product) => product.id === selectedProductId) ?? null
      : null;
  const menuItemDetailUsecase = new MenuItemDetailUsecase(menuRepository, {
    productId: selectedProductId,
    product: selectedProduct,
  });
  // Only the floating cart bar's count/total reads this instance — the
  // route has no `?item=` param (that's the cart route's, P4) — but the
  // constructor still takes a real `CartQueryRepository`, the same way
  // `menuItemDetailUsecase` above still takes a full `MenuRepository` it
  // only exercises part of.
  const cartUsecase = new CartUsecase(cartRepository, new UrlCartQueryRepository());

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
