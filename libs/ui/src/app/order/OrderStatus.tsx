import { ApiPaymentRepository } from '../../data/api/payment';
import { CookieSessionRepository } from '../../data/session/CookieSessionRepository';
import { Payment } from '../../domain/entities/Payment';
import { OrderStatusUsecase } from '../../domain/usecases/orderStatus';
import { OrderStatusHandler } from '../../presentation/handlers/order/OrderStatusHandler';

export type OrderStatusProps = {
  sessionId: string;
  reference: string;
  payment?: Payment | null;
};

export function OrderStatus({ sessionId, reference, payment }: OrderStatusProps) {
  const sessionRepository = new CookieSessionRepository(sessionId);
  const paymentRepository = new ApiPaymentRepository(sessionRepository);

  const orderStatusUsecase = new OrderStatusUsecase(paymentRepository, {
    reference,
    payment,
  });

  return (
    <OrderStatusHandler
      orderStatusUsecase={orderStatusUsecase}
      sessionRepository={sessionRepository}
    />
  );
}
