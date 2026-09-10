import { QueryClient } from '@tanstack/react-query';
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
import { MenuListHandler } from '../../presentation/handlers/order/MenuListHandler';

export type MenuListProps = {
  sessionId: string;
  code: string;
  table?: PublicTable | null;
  products: Product[];
  categories: Category[];
  variants: Variant[];
  selectedProductId: number | null;
};

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
  const selectedProduct =
    selectedProductId !== null
      ? products.find((product) => product.id === selectedProductId) ?? null
      : null;
  const menuItemDetailUsecase = new MenuItemDetailUsecase(menuRepository, {
    productId: selectedProductId,
    product: selectedProduct,
  });
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
