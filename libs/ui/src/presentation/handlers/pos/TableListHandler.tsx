import { useRouter } from 'solito/router';
import {
  AuthLogoutUsecase,
  Table,
  TableDeleteUsecase,
  TableListUsecase,
} from '../../../domain';
import { TableListScreen, TableListScreenProps } from '../../views/screens/pos/TableListScreen';
import { match, P } from 'ts-pattern';
import { useCallback, useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { useUsecase, useAuthLogout } from '../hooks';
import { useFocusEffect } from '../../../utils';

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
  const authLogout = useAuthLogout(authLogoutUsecase);
  const tableList = useUsecase(tableListUsecase);
  const tableDelete = useUsecase(tableDeleteUsecase);
  const router = useRouter();
  const toast = useToastController();

  useFocusEffect(
    useCallback(() => {
      tableList.dispatch({ type: 'FETCH' });
    }, [tableList.dispatch])
  );

  useEffect(() => {
    match(tableDelete.state)
      .with({ type: 'deletingSuccess' }, () => {
        toast.show('Delete Table Success');
        tableList.dispatch({ type: 'FETCH' });
      })
      .with({ type: 'deletingError' }, () => {
        toast.show('Delete Table Error');
      })
      .otherwise(() => {
        // noop
      });
  }, [tableDelete.state, tableList, toast]);

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
