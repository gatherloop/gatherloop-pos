import { useRouter } from 'solito/router';
import {
  AuthLogoutUsecase,
  StockCheck,
  StockCheckDeleteUsecase,
  StockCheckListUsecase,
} from '../../domain';
import { StockCheckListScreen, StockCheckListScreenProps } from './StockCheckListScreen';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useStockCheckDeleteController,
  useStockCheckListController,
} from '../controllers';

export type StockCheckListHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  stockCheckListUsecase: StockCheckListUsecase;
  stockCheckDeleteUsecase: StockCheckDeleteUsecase;
};

export const StockCheckListHandler = ({
  authLogoutUsecase,
  stockCheckListUsecase,
  stockCheckDeleteUsecase,
}: StockCheckListHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const stockCheckList = useStockCheckListController(stockCheckListUsecase);
  const stockCheckDelete = useStockCheckDeleteController(stockCheckDeleteUsecase);
  const router = useRouter();

  useEffect(() => {
    match(stockCheckDelete.state)
      .with({ type: 'deletingSuccess' }, () => {
        stockCheckList.dispatch({ type: 'FETCH' });
      })
      .otherwise(() => {
        // noop
      });
  }, [stockCheckDelete.state, stockCheckList]);

  return (
    <StockCheckListScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      onViewMenuPress={(stockCheck: StockCheck) =>
        router.push(`/stock-checks/${stockCheck.id}/edit`)
      }
      onEditMenuPress={(stockCheck: StockCheck) =>
        router.push(`/stock-checks/${stockCheck.id}/edit`)
      }
      onDeleteMenuPress={(stockCheck: StockCheck) =>
        stockCheckDelete.dispatch({
          type: 'SHOW_CONFIRMATION',
          stockCheckId: stockCheck.id,
        })
      }
      onViewPurchaseListMenuPress={(stockCheck: StockCheck) =>
        router.push(`/stock-checks/${stockCheck.id}/purchase-list`)
      }
      onEmptyActionPress={() => router.push('/stock-checks/create')}
      onRetryButtonPress={() => stockCheckList.dispatch({ type: 'FETCH' })}
      isRevalidating={stockCheckList.state.type === 'revalidating'}
      variant={match(stockCheckList.state)
        .returnType<StockCheckListScreenProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
        .with(
          { type: P.union('changingParams', 'loaded', 'revalidating') },
          ({ stockChecks }) => ({
            type: stockChecks.length > 0 ? 'loaded' : 'empty',
            items: stockChecks,
          })
        )
        .with({ type: 'error' }, () => ({ type: 'error' }))
        .exhaustive()}
      currentPage={stockCheckList.state.page}
      onPageChange={(page: number) =>
        stockCheckList.dispatch({ type: 'CHANGE_PARAMS', page })
      }
      totalItem={stockCheckList.state.totalItem}
      itemPerPage={stockCheckList.state.itemPerPage}
      isDeleteModalOpen={match(stockCheckDelete.state.type)
        .with(
          P.union('shown', 'deleting', 'deletingError', 'deletingSuccess'),
          () => true
        )
        .otherwise(() => false)}
      isDeleteButtonDisabled={stockCheckDelete.state.type === 'deleting'}
      onDeleteCancel={() =>
        stockCheckDelete.dispatch({ type: 'HIDE_CONFIRMATION' })
      }
      onDeleteConfirm={() => stockCheckDelete.dispatch({ type: 'DELETE' })}
    />
  );
};
