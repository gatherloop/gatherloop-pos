import { useRouter } from 'solito/router';
import {
  AuthLogoutUsecase,
  Material,
  MaterialDeleteUsecase,
  MaterialListUsecase,
} from '../../domain';
import { MaterialListScreen, MaterialListScreenProps } from './MaterialListScreen';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useMaterialDeleteController,
  useMaterialListController,
} from '../controllers';

export type MaterialListHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  materialListUsecase: MaterialListUsecase;
  materialDeleteUsecase: MaterialDeleteUsecase;
};

export const MaterialListHandler = ({
  authLogoutUsecase,
  materialListUsecase,
  materialDeleteUsecase,
}: MaterialListHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const materialList = useMaterialListController(materialListUsecase);
  const materialDelete = useMaterialDeleteController(materialDeleteUsecase);
  const router = useRouter();

  useEffect(() => {
    match(materialDelete.state)
      .with({ type: 'deletingSuccess' }, () => {
        materialList.dispatch({ type: 'FETCH' });
      })
      .otherwise(() => {
        // noop
      });
  }, [materialDelete.state, materialList]);

  return (
    <MaterialListScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      onEditMenuPress={(material: Material) =>
        router.push(`/materials/${material.id}`)
      }
      onItemPress={(material: Material) =>
        router.push(`/materials/${material.id}`)
      }
      onDeleteMenuPress={(material: Material) =>
        materialDelete.dispatch({
          type: 'SHOW_CONFIRMATION',
          materialId: material.id,
        })
      }
      onEmptyActionPress={() => router.push('/materials/create')}
      onRetryButtonPress={() => materialList.dispatch({ type: 'FETCH' })}
      isRevalidating={materialList.state.type === 'revalidating'}
      variant={match(materialList.state)
        .returnType<MaterialListScreenProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
        .with(
          { type: P.union('changingParams', 'loaded', 'revalidating') },
          ({ materials }) => ({
            type: materials.length > 0 ? 'loaded' : 'empty',
            items: materials,
          })
        )
        .with({ type: 'error' }, () => ({ type: 'error' }))
        .exhaustive()}
      searchValue={materialList.state.query}
      onSearchValueChange={(query: string) =>
        materialList.dispatch({
          type: 'CHANGE_PARAMS',
          query,
          page: 1,
          fetchDebounceDelay: 600,
        })
      }
      currentPage={materialList.state.page}
      onPageChange={(page: number) =>
        materialList.dispatch({ type: 'CHANGE_PARAMS', page })
      }
      totalItem={materialList.state.totalItem}
      itemPerPage={materialList.state.itemPerPage}
      isDeleteModalOpen={match(materialDelete.state.type)
        .with(
          P.union('shown', 'deleting', 'deletingError', 'deletingSuccess'),
          () => true
        )
        .otherwise(() => false)}
      isDeleteButtonDisabled={materialDelete.state.type === 'deleting'}
      onDeleteCancel={() =>
        materialDelete.dispatch({ type: 'HIDE_CONFIRMATION' })
      }
      onDeleteConfirm={() => materialDelete.dispatch({ type: 'DELETE' })}
    />
  );
};
