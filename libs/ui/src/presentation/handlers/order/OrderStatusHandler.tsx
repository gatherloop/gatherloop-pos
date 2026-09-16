import { match, P } from 'ts-pattern';
import { useRouter } from 'solito/router';
import { SessionRepository } from '../../../domain/repositories/session';
import { OrderStatusUsecase } from '../../../domain/usecases/orderStatus';
import { useOrderStatus } from '../hooks/useOrderStatus';
import {
  OrderStatusScreen,
  OrderStatusScreenVariant,
} from '../../views/screens/order/OrderStatusScreen';

export type OrderStatusHandlerProps = {
  orderStatusUsecase: OrderStatusUsecase;
  sessionRepository: SessionRepository;
};

export const OrderStatusHandler = ({
  orderStatusUsecase,
  sessionRepository,
}: OrderStatusHandlerProps) => {
  const orderStatus = useOrderStatus(orderStatusUsecase);
  const router = useRouter();

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
