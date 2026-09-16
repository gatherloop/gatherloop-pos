import { ApiPaymentRepository } from '../../data/api/payment';
import { CookieSessionRepository } from '../../data/session/CookieSessionRepository';
import { PaymentSummary } from '../../domain/entities/Payment';
import { OrderHistoryUsecase } from '../../domain/usecases/orderHistory';
import { OrderHistoryHandler } from '../../presentation/handlers/order/OrderHistoryHandler';

export type OrderHistoryProps = {
  sessionId: string;
  payments: PaymentSummary[];
};

export function OrderHistory({ sessionId, payments }: OrderHistoryProps) {
  const sessionRepository = new CookieSessionRepository(sessionId);
  const paymentRepository = new ApiPaymentRepository(sessionRepository);

  const orderHistoryUsecase = new OrderHistoryUsecase(paymentRepository, {
    payments,
  });

  return (
    <OrderHistoryHandler
      orderHistoryUsecase={orderHistoryUsecase}
      sessionRepository={sessionRepository}
    />
  );
}
