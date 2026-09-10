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
  table?: PublicTable | null;
  payment?: Payment | null;
};

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
