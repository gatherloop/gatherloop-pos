import { QueryClient } from '@tanstack/react-query';
// Deep imports, not the root barrels (D20): those also re-export every POS
// composition root, which would bloat the customer bundle with the POS (D6).
import { ApiMenuRepository } from '../data/api/menu';
import { MenuItemDetailUsecase } from '../domain/usecases/menuItemDetail';
import { MenuItemDetailHandler } from '../presentation/screens/MenuItemDetailHandler';
import { useCart } from './CartProvider';

export type MenuItemDetailProps = {
  productId: number;
};

// Composition root for the item detail sheet (FR-6 phase 8, cart wiring
// phase 9, in docs/prd-table-ordering.md). Mounted alongside `MenuList` at
// `/order/t/{code}/products/{productId}` so the menu stays visible behind
// the sheet. The Add-to-cart CTA dispatches into the app-wide `CartProvider`
// (mounted above the router, alongside `SessionProvider`) rather than
// owning a cart repository itself — the same machine backs the floating bar
// and cart screen once phase 10 lands.
export function MenuItemDetail({ productId }: MenuItemDetailProps) {
  const client = new QueryClient();
  const menuRepository = new ApiMenuRepository(client);
  const menuItemDetailUsecase = new MenuItemDetailUsecase(menuRepository, {
    productId,
  });
  const cart = useCart();

  return (
    <MenuItemDetailHandler
      menuItemDetailUsecase={menuItemDetailUsecase}
      onAddToCart={({ variantId, amount, note }) =>
        cart.dispatch({ type: 'ADD_ITEM', variantId, amount, note })
      }
    />
  );
}
