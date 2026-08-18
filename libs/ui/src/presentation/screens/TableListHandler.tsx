import { useRouter } from 'solito/router';
import {
  AuthLogoutUsecase,
  Table,
  TableDeleteUsecase,
  TableListUsecase,
} from '../../domain';
import { TableListScreen, TableListScreenProps } from './TableListScreen';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useTableDeleteController,
  useTableListController,
} from '../controllers';

export type TableListHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  tableListUsecase: TableListUsecase;
  tableDeleteUsecase: TableDeleteUsecase;
};

export const TableListHandler = ({
  authLogoutUsecase,
  tableListUsecase,
  tableDeleteUsecase,
}: TableListHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const tableList = useTableListController(tableListUsecase);
  const tableDelete = useTableDeleteController(tableDeleteUsecase);
  const router = useRouter();

  useEffect(() => {
    match(tableDelete.state)
      .with({ type: 'deletingSuccess' }, () => {
        tableList.dispatch({ type: 'FETCH' });
      })
      .otherwise(() => {
        // noop
      });
  }, [tableDelete.state, tableList]);

  return (
    <TableListScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      onEditMenuPress={(table: Table) => router.push(`/tables/${table.id}`)}
      onItemPress={(table: Table) => router.push(`/tables/${table.id}`)}
      onDeleteMenuPress={(table: Table) =>
        tableDelete.dispatch({
          type: 'SHOW_CONFIRMATION',
          tableId: table.id,
        })
      }
      onEmptyActionPress={() => router.push('/tables/create')}
      onRetryButtonPress={() => tableList.dispatch({ type: 'FETCH' })}
      isRevalidating={tableList.state.type === 'revalidating'}
      variant={match(tableList.state)
        .returnType<TableListScreenProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
        .with({ type: P.union('loaded', 'revalidating') }, ({ tables }) => ({
          type: tables.length > 0 ? 'loaded' : 'empty',
          tables,
        }))
        .with({ type: 'error' }, () => ({ type: 'error' }))
        .exhaustive()}
      isDeleteModalOpen={match(tableDelete.state.type)
        .with(
          P.union('shown', 'deleting', 'deletingError', 'deletingSuccess'),
          () => true
        )
        .otherwise(() => false)}
      isDeleteButtonDisabled={tableDelete.state.type === 'deleting'}
      onDeleteCancel={() => tableDelete.dispatch({ type: 'HIDE_CONFIRMATION' })}
      onDeleteConfirm={() => tableDelete.dispatch({ type: 'DELETE' })}
    />
  );
};
