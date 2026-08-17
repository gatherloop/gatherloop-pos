import { RootProvider } from '@gatherloop-pos/provider';
import {
  MenuItemDetail,
  MenuList,
  SessionProvider,
  TableResolve,
} from '@gatherloop-pos/ui/order';
import { Router } from '../router/Router';

// D17/D19 in docs/prd-table-ordering.md: `/t/{code}` and
// `/t/{code}/products/{productId}` are the QR-facing routes so far — cart
// and checkout land in later phases. The item detail route renders
// `MenuItemDetail` alongside `MenuList`, not instead of it, since the item
// detail sheet (FR-6) sits on top of the menu rather than replacing it. A
// bare `/` (no code) and any unmatched path both fall back to
// `TableResolve`'s `code: null` outcome, which is the "scan the QR at your
// table" screen (D17) rather than a dedicated 404.
export function App() {
  return (
    <RootProvider>
      <SessionProvider>
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
      </SessionProvider>
    </RootProvider>
  );
}

export default App;
