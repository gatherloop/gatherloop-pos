import { ApiPaymentRepository } from '../../data/api/payment';
import { CookieSessionRepository } from '../../data/session/CookieSessionRepository';
import { Payment } from '../../domain/entities/Payment';
import { OrderStatusUsecase } from '../../domain/usecases/orderStatus';
import { OrderStatusHandler } from '../../presentation/handlers/order/OrderStatusHandler';

export type OrderStatusProps = {
  sessionId: string;
  reference: string;
  payment?: Payment | null;
  accessKey?: string;
};

export function OrderStatus({
  sessionId,
  reference,
  payment,
  accessKey,
}: OrderStatusProps) {
  const sessionRepository = new CookieSessionRepository(sessionId);
  const paymentRepository = new ApiPaymentRepository(
    sessionRepository,
    accessKey
  );

  const orderStatusUsecase = new OrderStatusUsecase(paymentRepository, {
    reference,
    payment,
  });
  const cashierLocation =
    process.env['NEXT_PUBLIC_ORDER_CASHIER_LOCATION'] || 'Lantai 1';

  return (
    <OrderStatusHandler
      orderStatusUsecase={orderStatusUsecase}
      paymentRepository={paymentRepository}
      sessionRepository={sessionRepository}
      cashierLocation={cashierLocation}
    />
  );
}
