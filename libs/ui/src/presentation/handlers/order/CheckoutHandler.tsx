import { useEffect } from 'react';
import { match, P } from 'ts-pattern';
import { useRouter } from 'solito/router';
// Deep import, not the `domain` barrel (D20): that barrel also re-exports
// every POS usecase, which drags unrelated weight into the order bundle.
import { SessionRepository } from '../../../domain/repositories/session';
import { TableResolveUsecase } from '../../../domain/usecases/tableResolve';
import { useTableResolveController } from '../../controllers/TableResolveController';
import { CheckoutScreen } from '../../screens/order/CheckoutScreen';
import { TableResolveScreenProps } from '../../screens/order/TableResolveScreen';

export type CheckoutHandlerProps = {
  tableResolveUsecase: TableResolveUsecase;
  sessionRepository: SessionRepository;
  enabled: boolean;
  tableCode: string;
};

// D9 in docs/trd-order-app-composition-and-ssr.md: the table shell
// (formerly the `TableResolve` wrapper) is folded in here —
// `tableResolveUsecase` is a sub-usecase of this screen now, the same shape
// `CartHandler`/`MenuListHandler` fold it into themselves in. No usecase and
// no domain/data layer backs the checkout slice itself — the stub makes no
// API call and creates nothing, so there is no state to manage beyond the
// build-time flag passed down from `app/order/Checkout.tsx`.
export const CheckoutHandler = ({
  tableResolveUsecase,
  sessionRepository,
  enabled,
  tableCode,
}: CheckoutHandlerProps) => {
  const tableResolve = useTableResolveController(tableResolveUsecase);
  const router = useRouter();

  // Only a successful resolution is worth remembering (FR-4) — a code the
  // API just rejected has nothing useful to persist for a future cart.
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
