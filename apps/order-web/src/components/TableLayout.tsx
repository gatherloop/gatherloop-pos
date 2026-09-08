import {
  LoadingView,
  OrderLayout,
  TableResolve,
} from '@gatherloop-pos/ui/order';
import { useRouter } from 'next/router';
import { ReactNode } from 'react';

export type TableLayoutProps = {
  // D3 in docs/trd-order-app-composition-and-ssr.md: resolved server-side by
  // the page's getServerSideProps, forwarded here via _app.tsx's
  // getLayout(page, pageProps) — temporary scaffolding, gone with this
  // component once P5 folds TableResolve into each screen's own root.
  sessionId?: string;
  children?: ReactNode;
  hideCartBar?: boolean;
};

// D4/D5.2 in docs/trd-order-app-nextjs-migration.md: rendered as the same
// `getLayout` component reference across every `/t/[code]/**` page, so React
// reconciles it by type instead of remounting it on navigation — that's what
// keeps TableResolve (and, via its children, MenuList/Cart) mounted across
// menu -> item sheet -> cart -> checkout.
//
// A statically optimised dynamic page has an empty `router.query` until
// hydration fills it in, so `code` is `undefined` on first render. Handing
// TableResolve a null code here would flash the "scan the QR" screen before
// the code arrives — render TableResolveScreen's own `resolving` variant
// instead until the router is ready.
export const TableLayout = ({
  sessionId,
  children,
  hideCartBar,
}: TableLayoutProps) => {
  const router = useRouter();

  if (!router.isReady) {
    return (
      <OrderLayout>
        <LoadingView title="Memuat meja..." />
      </OrderLayout>
    );
  }

  const code = typeof router.query.code === 'string' ? router.query.code : null;
  return (
    <TableResolve code={code} sessionId={sessionId} hideCartBar={hideCartBar}>
      {children}
    </TableResolve>
  );
};
