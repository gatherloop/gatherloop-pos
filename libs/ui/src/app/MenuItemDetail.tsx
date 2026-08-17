import { QueryClient } from '@tanstack/react-query';
// Deep imports, not the root barrels (D20): those also re-export every POS
// composition root, which drags solito/next into a Vite build.
import { ApiMenuRepository } from '../data/api/menu';
import { MenuItemDetailUsecase } from '../domain/usecases/menuItemDetail';
import { MenuItemDetailHandler } from '../presentation/screens/MenuItemDetailHandler';

export type MenuItemDetailProps = {
  productId: number;
};

// Composition root for the item detail sheet (FR-6 phase 8 in
// docs/prd-table-ordering.md). Mounted alongside `MenuList` at
// `/order/t/{code}/products/{productId}` so the menu stays visible behind
// the sheet. The Add-to-cart CTA is wired to a no-op — phase 9 connects it
// to the cart machine.
export function MenuItemDetail({ productId }: MenuItemDetailProps) {
  const client = new QueryClient();
  const menuRepository = new ApiMenuRepository(client);
  const menuItemDetailUsecase = new MenuItemDetailUsecase(menuRepository, {
    productId,
  });

  return (
    <MenuItemDetailHandler
      menuItemDetailUsecase={menuItemDetailUsecase}
      onAddToCart={() => {
        // Connected to the cart machine in phase 9 (FR-7). No-op for now,
        // per the phase-8 scope in docs/prd-table-ordering.md.
      }}
    />
  );
}
