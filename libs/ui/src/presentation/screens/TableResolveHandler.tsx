import { ReactNode, useEffect } from 'react';
import { match, P } from 'ts-pattern';
// Deep imports, not the `domain` barrel (D20): that barrel also re-exports
// every POS usecase, which drags unrelated weight into the order bundle.
import { SessionRepository } from '../../domain/repositories/session';
import { TableResolveUsecase } from '../../domain/usecases/tableResolve';
import { useTableResolveController } from '../controllers/TableResolveController';
import {
  TableResolveScreen,
  TableResolveScreenProps,
} from './TableResolveScreen';

export type TableResolveHandlerProps = {
  tableResolveUsecase: TableResolveUsecase;
  sessionRepository: SessionRepository;
  children?: ReactNode;
};

export const TableResolveHandler = ({
  tableResolveUsecase,
  sessionRepository,
  children,
}: TableResolveHandlerProps) => {
  const tableResolve = useTableResolveController(tableResolveUsecase);

  // Only a successful resolution is worth remembering (FR-4) — a code the
  // API just rejected has nothing useful to persist for a future cart.
  useEffect(() => {
    if (tableResolve.state.type === 'resolved' && tableResolve.state.code) {
      sessionRepository.setTableCode(tableResolve.state.code);
    }
  }, [tableResolve.state, sessionRepository]);

  return (
    <TableResolveScreen
      variant={match(tableResolve.state)
        .returnType<TableResolveScreenProps['variant']>()
        .with({ type: P.union('idle', 'resolving') }, () => ({
          type: 'resolving',
        }))
        .with({ type: 'noCode' }, () => ({ type: 'noQr' }))
        .with({ type: 'notFound' }, () => ({ type: 'invalidQr' }))
        .with({ type: 'error' }, () => ({
          type: 'error',
          onRetryButtonPress: () =>
            tableResolve.dispatch({ type: 'FETCH' }),
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
    >
      {children}
    </TableResolveScreen>
  );
};
