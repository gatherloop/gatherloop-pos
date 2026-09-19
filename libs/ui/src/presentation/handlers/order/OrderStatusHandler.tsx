import { match, P } from 'ts-pattern';
import { useRouter } from 'solito/router';
import { SessionRepository } from '../../../domain/repositories/session';
import { OrderNotificationSubscribeUsecase } from '../../../domain/usecases/orderNotificationSubscribe';
import { OrderStatusUsecase } from '../../../domain/usecases/orderStatus';
import { OrderNotificationOptInVariant } from '../../views/components/orderStatus/OrderNotificationOptIn';
import { useOrderStatus } from '../hooks/useOrderStatus';
import { useUsecase } from '../hooks/useUsecase';
import {
  OrderStatusScreen,
  OrderStatusScreenVariant,
} from '../../views/screens/order/OrderStatusScreen';

export type OrderStatusHandlerProps = {
  orderStatusUsecase: OrderStatusUsecase;
  orderNotificationSubscribeUsecase: OrderNotificationSubscribeUsecase;
  sessionRepository: SessionRepository;
};

export const OrderStatusHandler = ({
  orderStatusUsecase,
  orderNotificationSubscribeUsecase,
  sessionRepository,
}: OrderStatusHandlerProps) => {
  const orderStatus = useOrderStatus(orderStatusUsecase);
  const notificationSubscribe = useUsecase(orderNotificationSubscribeUsecase);
  const router = useRouter();

  const notificationOptIn: OrderNotificationOptInVariant = match(
    notificationSubscribe.state
  )
    .returnType<OrderNotificationOptInVariant>()
    .with({ type: 'unsupported' }, () => ({ type: 'hidden' }))
    .with({ type: 'needsInstall' }, () => ({ type: 'needsInstall' }))
    .with({ type: 'idle' }, () => ({
      type: 'idle',
      onSubscribePress: () =>
        notificationSubscribe.dispatch({ type: 'SUBSCRIBE' }),
    }))
    .with({ type: P.union('checkingPermission', 'subscribing') }, () => ({
      type: 'subscribing',
    }))
    .with({ type: 'permissionDenied' }, () => ({ type: 'permissionDenied' }))
    .with({ type: 'subscribeError' }, (state) => ({
      type: 'subscribeError',
      errorMessage: state.errorMessage ?? 'Failed to enable notifications',
      onRetryPress: () => notificationSubscribe.dispatch({ type: 'RETRY' }),
    }))
    .with({ type: 'subscribed' }, () => ({
      type: 'subscribed',
      onUnsubscribePress: () =>
        notificationSubscribe.dispatch({ type: 'UNSUBSCRIBE' }),
    }))
    .with({ type: 'unsubscribing' }, () => ({ type: 'unsubscribing' }))
    .exhaustive();

  const variant: OrderStatusScreenVariant = match(orderStatus.state)
    .returnType<OrderStatusScreenVariant>()
    .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
    .with({ type: 'notFound' }, () => ({ type: 'notFound' }))
    .with({ type: 'expired' }, () => ({ type: 'expired' }))
    .with({ type: 'error' }, () => ({
      type: 'error',
      onRetryPress: () => orderStatus.dispatch({ type: 'FETCH' }),
    }))
    .with({ type: 'awaitingPayment' }, (state) =>
      state.payment
        ? {
            type: 'awaitingPayment',
            payment: state.payment,
            onCountdownElapsed: () =>
              orderStatus.dispatch({ type: 'COUNTDOWN_ELAPSED' }),
          }
        : { type: 'loading' }
    )
    .with({ type: 'preparing' }, (state) =>
      state.payment
        ? {
            type: 'preparing',
            payment: state.payment,
            isPolling: state.isPolling,
            notificationOptIn,
          }
        : { type: 'notFound' }
    )
    .with({ type: 'ready' }, (state) =>
      state.payment
        ? { type: 'ready', payment: state.payment }
        : { type: 'notFound' }
    )
    .exhaustive();

  const tableCode = sessionRepository.getTableCode();
  const menuPath = tableCode ? `/t/${tableCode}` : '/';
  const cartPath = tableCode ? `/t/${tableCode}/cart` : '/';

  return (
    <OrderStatusScreen
      variant={variant}
      onBackToMenuPress={() => router.push(menuPath)}
      onBackToCartPress={() => router.push(cartPath)}
      onHistoryPress={() => router.push('/orders')}
    />
  );
};
