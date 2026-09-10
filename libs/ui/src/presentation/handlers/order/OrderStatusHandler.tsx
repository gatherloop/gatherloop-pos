import { useEffect } from 'react';
import { match, P } from 'ts-pattern';
import { useRouter } from 'solito/router';
import { SessionRepository } from '../../../domain/repositories/session';
import { OrderStatusUsecase } from '../../../domain/usecases/orderStatus';
import { TableResolveUsecase } from '../../../domain/usecases/tableResolve';
import { useOrderStatus } from '../hooks/useOrderStatus';
import { useTableResolve } from '../hooks/useTableResolve';
import {
  OrderStatusScreen,
  OrderStatusScreenVariant,
} from '../../views/screens/order/OrderStatusScreen';
import { TableResolveScreenProps } from '../../views/screens/order/TableResolveScreen';

export type OrderStatusHandlerProps = {
  tableResolveUsecase: TableResolveUsecase;
  orderStatusUsecase: OrderStatusUsecase;
  sessionRepository: SessionRepository;
  tableCode: string;
};

export const OrderStatusHandler = ({
  tableResolveUsecase,
  orderStatusUsecase,
  sessionRepository,
  tableCode,
}: OrderStatusHandlerProps) => {
  const tableResolve = useTableResolve(tableResolveUsecase);
  const orderStatus = useOrderStatus(orderStatusUsecase);
  const router = useRouter();

  useEffect(() => {
    if (tableResolve.state.type === 'resolved' && tableResolve.state.code) {
      sessionRepository.setTableCode(tableResolve.state.code);
    }
  }, [tableResolve.state, sessionRepository]);

  const variant: OrderStatusScreenVariant = match(orderStatus.state)
    .returnType<OrderStatusScreenVariant>()
    .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
    .with({ type: 'notFound' }, () => ({ type: 'notFound' }))
    .with({ type: 'error' }, () => ({
      type: 'error',
      onRetryPress: () => orderStatus.dispatch({ type: 'FETCH' }),
    }))
    .with({ type: 'loaded' }, (state) =>
      state.payment
        ? { type: 'loaded', payment: state.payment }
        : { type: 'notFound' }
    )
    .exhaustive();

  return (
    <OrderStatusScreen
      tableVariant={match(tableResolve.state)
        .returnType<TableResolveScreenProps['variant']>()
        .with({ type: P.union('idle', 'resolving') }, () => ({
          type: 'resolving',
        }))
        .with({ type: 'noCode' }, () => ({ type: 'noQr' }))
        .with({ type: 'notFound' }, () => ({ type: 'invalidQr' }))
        .with({ type: 'error' }, () => ({
          type: 'error',
          onRetryButtonPress: () => tableResolve.dispatch({ type: 'FETCH' }),
        }))
        .with({ type: 'resolved' }, ({ table }) =>
          table
            ? { type: 'resolved', table }
            : {
                type: 'error',
                onRetryButtonPress: () =>
                  tableResolve.dispatch({ type: 'FETCH' }),
              }
        )
        .exhaustive()}
      variant={variant}
      onBackToMenuPress={() => router.push(`/t/${tableCode}`)}
    />
  );
};
