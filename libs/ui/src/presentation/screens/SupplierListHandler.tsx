import { useRouter } from 'solito/router';
import {
  AuthLogoutUsecase,
  Supplier,
  SupplierDeleteUsecase,
  SupplierListUsecase,
} from '../../domain';
import { SupplierListScreen, SupplierListScreenProps } from './SupplierListScreen';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useSupplierDeleteController,
  useSupplierListController,
} from '../controllers';

export type SupplierListHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  supplierListUsecase: SupplierListUsecase;
  supplierDeleteUsecase: SupplierDeleteUsecase;
};

export const SupplierListHandler = ({
  authLogoutUsecase,
  supplierListUsecase,
  supplierDeleteUsecase,
}: SupplierListHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const supplierList = useSupplierListController(supplierListUsecase);
  const supplierDelete = useSupplierDeleteController(supplierDeleteUsecase);
  const router = useRouter();

  useEffect(() => {
    match(supplierDelete.state)
      .with({ type: 'deletingSuccess' }, () => {
        supplierList.dispatch({ type: 'FETCH' });
      })
      .otherwise(() => {
        // noop
      });
  }, [supplierDelete.state, supplierList]);

  return (
    <SupplierListScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      onDeleteMenuPress={(supplier: Supplier) =>
        supplierDelete.dispatch({
          type: 'SHOW_CONFIRMATION',
          supplierId: supplier.id,
        })
      }
      onOpenMapMenuPress={(supplier: Supplier) =>
        router.push(supplier.mapsLink)
      }
      onEditMenuPress={(supplier: Supplier) =>
        router.push(`/suppliers/${supplier.id}`)
      }
      onItemPress={(supplier: Supplier) =>
        router.push(`/suppliers/${supplier.id}`)
      }
      onEmptyActionPress={() => router.push('/suppliers/create')}
      onRetryButtonPress={() => supplierList.dispatch({ type: 'FETCH' })}
      isRevalidating={supplierList.state.type === 'revalidating'}
      variant={match(supplierList.state)
        .returnType<SupplierListScreenProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({
          type: 'loading',
        }))
        .with(
          { type: P.union('changingParams', 'loaded', 'revalidating') },
          ({ suppliers }) => ({
            type: suppliers.length > 0 ? 'loaded' : 'empty',
            items: suppliers,
          })
        )
        .with({ type: 'error' }, () => ({ type: 'error' }))
        .exhaustive()}
      suppliers={supplierList.state.suppliers}
      searchValue={supplierList.state.query}
      onSearchValueChange={(query: string) =>
        supplierList.dispatch({
          type: 'CHANGE_PARAMS',
          query,
          page: 1,
          fetchDebounceDelay: 600,
        })
      }
      currentPage={supplierList.state.page}
      onPageChange={(page: number) =>
        supplierList.dispatch({ type: 'CHANGE_PARAMS', page })
      }
      totalItem={supplierList.state.totalItem}
      itemPerPage={supplierList.state.itemPerPage}
      isDeleteModalOpen={match(supplierDelete.state.type)
        .with(
          P.union('shown', 'deleting', 'deletingError', 'deletingSuccess'),
          () => true
        )
        .otherwise(() => false)}
      isDeleteButtonDisabled={supplierDelete.state.type === 'deleting'}
      onDeleteCancel={() =>
        supplierDelete.dispatch({ type: 'HIDE_CONFIRMATION' })
      }
      onDeleteConfirm={() => supplierDelete.dispatch({ type: 'DELETE' })}
    />
  );
};
