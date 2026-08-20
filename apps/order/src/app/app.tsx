import { RootProvider } from '@gatherloop-pos/provider';
import {
  Cart,
  CartItemEdit,
  CartProvider,
  Checkout,
  MenuItemDetail,
  MenuList,
  SessionProvider,
  TableResolve,
} from '@gatherloop-pos/ui/order';
import { Router } from '../router/Router';

// D17/D19 in docs/prd-table-ordering.md: `/t/{code}`,
// `/t/{code}/products/{productId}`, `/t/{code}/cart`,
// `/t/{code}/cart/items/{cartItemId}` and `/t/{code}/checkout` are the
// QR-facing routes. `CartProvider` wraps the router (FR-7 phase 9)
// so the one cart machine it owns is reachable from every route, including
// the item detail sheet's Add-to-cart CTA (phase 8), the floating bar
// (phase 10) and the cart screen itself (phase 10). The item detail route
// renders `MenuItemDetail` alongside `MenuList`, not instead of it, since
// the item detail sheet (FR-6) sits on top of the menu rather than
// replacing it. The cart-item-edit route (FR-9 phase 9 in
// docs/prd-order-app-ux-improvements.md) is the same alongside-mount
// pattern: `CartItemEdit` sits on top of `Cart` rather than replacing it, so
// the cart stays visible behind the modal and Android back dismisses it.
// The cart and checkout routes both hide the floating bar (`hideCartBar`)
// since `Cart`/`Checkout` render their own sticky bottom content in the
// same footer position. The checkout route (FR-8 phase 11) always renders
// `Checkout`, whose own build-time flag decides whether the QRIS stub or a
// "not available" message shows — the route itself is not flag-gated, so
// `Cart`'s Checkout button never has to know about the flag. A bare `/` (no
// code) and any unmatched path both fall back to `TableResolve`'s
// `code: null` outcome, which is the "scan the QR at your table" screen
// (D17) rather than a dedicated 404.
export function App() {
  return (
    <RootProvider>
      <SessionProvider>
        <CartProvider>
          <Router
            routes={[
              {
                path: '/t/:code/products/:productId',
                element: ({ code, productId }) => (
                  <TableResolve code={code}>
                    <MenuList tableCode={code} />
                    <MenuItemDetail productId={Number(productId)} />
                  </TableResolve>
                ),
              },
              {
                path: '/t/:code/cart/items/:cartItemId',
                element: ({ code, cartItemId }) => (
                  <TableResolve code={code} hideCartBar>
                    <Cart tableCode={code} />
                    <CartItemEdit cartItemId={Number(cartItemId)} />
                  </TableResolve>
                ),
              },
              {
                path: '/t/:code/cart',
                element: ({ code }) => (
                  <TableResolve code={code} hideCartBar>
                    <Cart tableCode={code} />
                  </TableResolve>
                ),
              },
              {
                path: '/t/:code/checkout',
                element: ({ code }) => (
                  <TableResolve code={code} hideCartBar>
                    <Checkout tableCode={code} />
                  </TableResolve>
                ),
              },
              {
                path: '/t/:code',
                element: ({ code }) => (
                  <TableResolve code={code}>
                    <MenuList tableCode={code} />
                  </TableResolve>
                ),
              },
              {
                path: '/',
                element: () => <TableResolve code={null} />,
              },
            ]}
            notFound={<TableResolve code={null} />}
          />
        </CartProvider>
      </SessionProvider>
    </RootProvider>
  );
}

export default App;
