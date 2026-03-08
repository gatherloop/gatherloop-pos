import { useRouter } from 'solito/router';
import {
  AuthLogoutUsecase,
  VariantDeleteUsecase,
  VariantListUsecase,
} from '../../domain';
import { Variant } from '../../domain';
import { VariantListScreen, VariantListScreenProps } from './VariantListScreen';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useVariantDeleteController,
  useVariantListController,
} from '../controllers';

export type VariantListHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  variantListUsecase: VariantListUsecase;
  variantDeleteUsecase: VariantDeleteUsecase;
};

export const VariantListHandler = ({
  authLogoutUsecase,
  variantListUsecase,
  variantDeleteUsecase,
}: VariantListHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const variantList = useVariantListController(variantListUsecase);
  const variantDelete = useVariantDeleteController(variantDeleteUsecase);
  const router = useRouter();

  useEffect(() => {
    match(variantDelete.state)
      .with({ type: 'deletingSuccess' }, () => {
        variantList.dispatch({ type: 'FETCH' });
      })
      .otherwise(() => {
        // noop
      });
  }, [variantDelete.state, variantList]);

  return (
    <VariantListScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      onEditMenuPress={(variant: Variant) =>
        router.push(`/variants/${variant.id}`)
      }
      onDeleteMenuPress={(variant: Variant) =>
        variantDelete.dispatch({
          type: 'SHOW_CONFIRMATION',
          variantId: variant.id,
        })
      }
      onItemPress={(variant: Variant) =>
        router.push(`/variants/${variant.id}`)
      }
      onRetryButtonPress={() => variantList.dispatch({ type: 'FETCH' })}
      variant={match(variantList.state)
        .returnType<VariantListScreenProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({
          type: 'loading',
        }))
        .with(
          { type: P.union('changingParams', 'loaded', 'revalidating') },
          ({ variants }) => ({
            type: variants.length > 0 ? 'loaded' : 'empty',
            items: variants,
          })
        )
        .with({ type: 'error' }, () => ({ type: 'error' }))
        .exhaustive()}
      variants={variantList.state.variants}
      searchValue={variantList.state.query}
      onSearchValueChange={(query: string) =>
        variantList.dispatch({
          type: 'CHANGE_PARAMS',
          query,
          page: 1,
          fetchDebounceDelay: 600,
        })
      }
      currentPage={variantList.state.page}
      onPageChange={(page: number) =>
        variantList.dispatch({ type: 'CHANGE_PARAMS', page })
      }
      totalItem={variantList.state.totalItem}
      itemPerPage={variantList.state.itemPerPage}
      isDeleteModalOpen={match(variantDelete.state.type)
        .with(
          P.union('shown', 'deleting', 'deletingError', 'deletingSuccess'),
          () => true
        )
        .otherwise(() => false)}
      isDeleteButtonDisabled={variantDelete.state.type === 'deleting'}
      onDeleteCancel={() =>
        variantDelete.dispatch({ type: 'HIDE_CONFIRMATION' })
      }
      onDeleteConfirm={() => variantDelete.dispatch({ type: 'DELETE' })}
    />
  );
};
