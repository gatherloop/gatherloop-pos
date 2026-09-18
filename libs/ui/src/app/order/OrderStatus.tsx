import { ApiPaymentRepository } from '../../data/api/payment';
import { ApiWebPushSubscriptionRepository } from '../../data/api/webPushSubscription';
import { ServiceWorkerWebPushRepository } from '../../data/browser/ServiceWorkerWebPushRepository';
import { CookieSessionRepository } from '../../data/session/CookieSessionRepository';
import { Payment } from '../../domain/entities/Payment';
import { OrderNotificationSubscribeUsecase } from '../../domain/usecases/orderNotificationSubscribe';
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
  const webPushRepository = new ServiceWorkerWebPushRepository();
  const webPushSubscriptionRepository = new ApiWebPushSubscriptionRepository(
    sessionRepository
  );

  const orderStatusUsecase = new OrderStatusUsecase(paymentRepository, {
    reference,
    payment,
  });
  const orderNotificationSubscribeUsecase = new OrderNotificationSubscribeUsecase(
    webPushRepository,
    webPushSubscriptionRepository
  );

  return (
    <OrderStatusHandler
      orderStatusUsecase={orderStatusUsecase}
      orderNotificationSubscribeUsecase={orderNotificationSubscribeUsecase}
      sessionRepository={sessionRepository}
    />
  );
}
