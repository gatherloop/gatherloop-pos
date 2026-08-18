import { RootProvider } from '@gatherloop-pos/provider';
import {
  Cart,
  CartProvider,
  MenuItemDetail,
  MenuList,
  SessionProvider,
  TableResolve,
} from '@gatherloop-pos/ui/order';
import { Router } from '../router/Router';

// D17/D19 in docs/prd-table-ordering.md: `/t/{code}`,
// `/t/{code}/products/{productId}` and `/t/{code}/cart` are the QR-facing
// routes so far — checkout lands in a later phase. `CartProvider` wraps the
// router (FR-7 phase 9) so the one cart machine it owns is reachable from
// every route, including the item detail sheet's Add-to-cart CTA (phase 8),
// the floating bar (phase 10) and the cart screen itself (phase 10). The
// item detail route renders `MenuItemDetail` alongside `MenuList`, not
// instead of it, since the item detail sheet (FR-6) sits on top of the menu
// rather than replacing it. The cart route hides the floating bar
// (`hideCartBar`) since `Cart` renders its own sticky Checkout bar in the
// same footer position. A bare `/` (no code) and any unmatched path both
// fall back to `TableResolve`'s `code: null` outcome, which is the "scan
// the QR at your table" screen (D17) rather than a dedicated 404.
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
                path: '/t/:code/cart',
                element: ({ code }) => (
                  <TableResolve code={code} hideCartBar>
                    <Cart tableCode={code} />
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
