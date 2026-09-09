// Deep imports, not the root barrels (D20): those also re-export every POS
// composition root, which would bloat the customer bundle with the POS (D6).
import { ApiPublicTableRepository } from '../../data/api/publicTable';
import { CookieSessionRepository } from '../../data/session/CookieSessionRepository';
import { PublicTable } from '../../domain/entities/PublicTable';
import { TableResolveUsecase } from '../../domain/usecases/tableResolve';
import { CheckoutHandler } from '../../presentation/handlers/order/CheckoutHandler';

export type CheckoutProps = {
  sessionId: string;
  code: string;
  // P6 in docs/trd-order-app-composition-and-ssr.md: seeded by the page's
  // getServerSideProps.
  table?: PublicTable | null;
};

// Composition root for the QRIS checkout stub (FR-8 phase 11). Per D9 in
// docs/trd-order-app-composition-and-ssr.md this now wires up the table
// shell too, in addition to the checkout stub itself — the whole vertical
// slice `/t/{code}/checkout` renders, structurally identical to
// `app/order/Cart.tsx` (§3.5). `CartScreen`'s Checkout button always routes
// here regardless of the flag (D10) — `NEXT_PUBLIC_ORDER_CHECKOUT_ENABLED`
// (D8 in docs/trd-order-app-nextjs-migration.md) only decides which message
// this screen shows, so a real checkout can be swapped in later without
// touching `CartScreen`.
export function Checkout({ sessionId, code, table }: CheckoutProps) {
  const sessionRepository = new CookieSessionRepository(sessionId);
  const publicTableRepository = new ApiPublicTableRepository();

  const tableResolveUsecase = new TableResolveUsecase(publicTableRepository, {
    code,
    table,
  });
  const enabled = process.env['NEXT_PUBLIC_ORDER_CHECKOUT_ENABLED'] === 'true';

  return (
    <CheckoutHandler
      tableResolveUsecase={tableResolveUsecase}
      sessionRepository={sessionRepository}
      enabled={enabled}
      tableCode={code}
    />
  );
}
