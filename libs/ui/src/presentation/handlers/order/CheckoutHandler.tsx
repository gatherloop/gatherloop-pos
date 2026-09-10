import { useEffect } from 'react';
import { match, P } from 'ts-pattern';
import { useRouter } from 'solito/router';
import { SessionRepository } from '../../../domain/repositories/session';
import { TableResolveUsecase } from '../../../domain/usecases/tableResolve';
import { useTableResolve } from '../hooks/useTableResolve';
import { CheckoutScreen } from '../../views/screens/order/CheckoutScreen';
import { TableResolveScreenProps } from '../../views/screens/order/TableResolveScreen';

export type CheckoutHandlerProps = {
  tableResolveUsecase: TableResolveUsecase;
  sessionRepository: SessionRepository;
  enabled: boolean;
  tableCode: string;
};

export const CheckoutHandler = ({
  tableResolveUsecase,
  sessionRepository,
  enabled,
  tableCode,
}: CheckoutHandlerProps) => {
  const tableResolve = useTableResolve(tableResolveUsecase);
  const router = useRouter();

  useEffect(() => {
    if (tableResolve.state.type === 'resolved' && tableResolve.state.code) {
      sessionRepository.setTableCode(tableResolve.state.code);
    }
  }, [tableResolve.state, sessionRepository]);

  return (
    <CheckoutScreen
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
      enabled={enabled}
      onBackToCartPress={() => router.push(`/t/${tableCode}/cart`)}
    />
  );
};
