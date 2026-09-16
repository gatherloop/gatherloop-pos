import { match, P } from 'ts-pattern';
import { useRouter } from 'solito/router';
import { PaymentSummary } from '../../../domain/entities/Payment';
import { SessionRepository } from '../../../domain/repositories/session';
import { OrderHistoryUsecase } from '../../../domain/usecases/orderHistory';
import { useUsecase } from '../hooks/useUsecase';
import {
  OrderHistoryScreen,
  OrderHistoryScreenVariant,
} from '../../views/screens/order/OrderHistoryScreen';

export type OrderHistoryHandlerProps = {
  orderHistoryUsecase: OrderHistoryUsecase;
  sessionRepository: SessionRepository;
};

export const OrderHistoryHandler = ({
  orderHistoryUsecase,
  sessionRepository,
}: OrderHistoryHandlerProps) => {
  const orderHistory = useUsecase(orderHistoryUsecase);
  const router = useRouter();

  const variant: OrderHistoryScreenVariant = match(orderHistory.state)
    .returnType<OrderHistoryScreenVariant>()
    .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
    .with({ type: 'error' }, () => ({
      type: 'error',
      onRetryPress: () => orderHistory.dispatch({ type: 'FETCH' }),
    }))
    .with({ type: P.union('loaded', 'revalidating') }, (state) =>
      state.payments.length > 0
        ? { type: 'loaded', payments: state.payments }
        : { type: 'empty' }
    )
    .exhaustive();

  const tableCode = sessionRepository.getTableCode();
  const menuPath = tableCode ? `/t/${tableCode}` : '/';

  return (
    <OrderHistoryScreen
      variant={variant}
      onItemPress={(payment: PaymentSummary) =>
        router.push(`/orders/${payment.reference}`)
      }
      onEmptyActionPress={() => router.push(menuPath)}
      onHistoryPress={() => router.push('/orders')}
    />
  );
};
