// Deep imports, not the root barrels (D20): those also re-export every POS
// composition root, which would bloat the customer bundle with the POS (D6).
import { ApiPaymentRepository } from '../../data/api/payment';
import { ApiPublicTableRepository } from '../../data/api/publicTable';
import { CookieSessionRepository } from '../../data/session/CookieSessionRepository';
import { Payment } from '../../domain/entities/Payment';
import { PublicTable } from '../../domain/entities/PublicTable';
import { OrderStatusUsecase } from '../../domain/usecases/orderStatus';
import { TableResolveUsecase } from '../../domain/usecases/tableResolve';
import { OrderStatusHandler } from '../../presentation/handlers/order/OrderStatusHandler';

export type OrderStatusProps = {
  sessionId: string;
  code: string;
  reference: string;
  // P6 in docs/trd-order-app-composition-and-ssr.md: seeded by the page's
  // getServerSideProps.
  table?: PublicTable | null;
  // Seeded by the page's getServerSideProps so the first paint is the real
  // order and not a spinner (FR-10).
  payment?: Payment | null;
};

// Composition root for the order status screen (FR-10, phase 12 in
// docs/prd-order-checkout-qris-doku.md). Per D9 in
// docs/trd-order-app-composition-and-ssr.md this wires up the table shell
// too, structurally identical to `app/order/Checkout.tsx`.
export function OrderStatus({
  sessionId,
  code,
  reference,
  table,
  payment,
}: OrderStatusProps) {
  const sessionRepository = new CookieSessionRepository(sessionId);
  const publicTableRepository = new ApiPublicTableRepository();
  const paymentRepository = new ApiPaymentRepository(sessionRepository);

  const tableResolveUsecase = new TableResolveUsecase(publicTableRepository, {
    code,
    table,
  });
  const orderStatusUsecase = new OrderStatusUsecase(paymentRepository, {
    reference,
    payment,
  });

  return (
    <OrderStatusHandler
      tableResolveUsecase={tableResolveUsecase}
      orderStatusUsecase={orderStatusUsecase}
      sessionRepository={sessionRepository}
      tableCode={code}
    />
  );
}
