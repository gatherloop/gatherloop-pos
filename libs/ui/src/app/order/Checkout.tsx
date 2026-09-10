// Deep imports, not the root barrels (D20): those also re-export every POS
// composition root, which would bloat the customer bundle with the POS (D6).
import { ApiCartRepository } from '../../data/api/cart';
import { ApiPaymentRepository } from '../../data/api/payment';
import { ApiPublicTableRepository } from '../../data/api/publicTable';
import { CookieSessionRepository } from '../../data/session/CookieSessionRepository';
import { UrlCartQueryRepository } from '../../data/url/cartQuery';
import { PublicTable } from '../../domain/entities/PublicTable';
import { CartUsecase } from '../../domain/usecases/cart';
import { CheckoutUsecase } from '../../domain/usecases/checkout';
import { TableResolveUsecase } from '../../domain/usecases/tableResolve';
import { CheckoutHandler } from '../../presentation/handlers/order/CheckoutHandler';

export type CheckoutProps = {
  sessionId: string;
  code: string;
  // P6 in docs/trd-order-app-composition-and-ssr.md: seeded by the page's
  // getServerSideProps.
  table?: PublicTable | null;
  // D24: seeded from `GET /customers/current` at SSR, so the name sheet
  // opens prefilled on the first paint instead of after a client fetch.
  customerName?: string;
};

// Composition root for the QRIS checkout screen (FR-9, phase 11 in
// docs/prd-order-checkout-qris-doku.md). Per D9 in
// docs/trd-order-app-composition-and-ssr.md this wires up the table shell
// too, in addition to checkout itself — the whole vertical slice
// `/t/{code}/checkout` renders, structurally identical to
// `app/order/Cart.tsx` (§3.5). `CartScreen`'s Checkout button always routes
// here regardless of the flag (D10) — `NEXT_PUBLIC_ORDER_CHECKOUT_ENABLED`
// (D20) only decides whether this screen shows the real checkout or
// today's "Checkout belum tersedia".
export function Checkout({
  sessionId,
  code,
  table,
  customerName,
}: CheckoutProps) {
  const sessionRepository = new CookieSessionRepository(sessionId);
  const publicTableRepository = new ApiPublicTableRepository();
  const cartRepository = new ApiCartRepository(sessionRepository);
  const cartQueryRepository = new UrlCartQueryRepository();
  const paymentRepository = new ApiPaymentRepository(sessionRepository);

  const tableResolveUsecase = new TableResolveUsecase(publicTableRepository, {
    code,
    table,
  });
  const cartUsecase = new CartUsecase(cartRepository, cartQueryRepository);
  const checkoutUsecase = new CheckoutUsecase(paymentRepository, {
    customerName,
  });
  const enabled = process.env['NEXT_PUBLIC_ORDER_CHECKOUT_ENABLED'] === 'true';

  return (
    <CheckoutHandler
      tableResolveUsecase={tableResolveUsecase}
      cartUsecase={cartUsecase}
      checkoutUsecase={checkoutUsecase}
      sessionRepository={sessionRepository}
      enabled={enabled}
      tableCode={code}
    />
  );
}
