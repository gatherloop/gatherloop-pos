import { RootProvider } from '@gatherloop-pos/provider';
import {
  MenuList,
  SessionProvider,
  TableResolve,
} from '@gatherloop-pos/ui/order';
import { Router } from '../router/Router';

// D17/D19 in docs/prd-table-ordering.md: `/t/{code}` is the only QR-facing
// route so far — item detail, cart and checkout land in later phases. A
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
