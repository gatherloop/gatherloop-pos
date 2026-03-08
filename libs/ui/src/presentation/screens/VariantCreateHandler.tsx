import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import { match, P } from 'ts-pattern';
import {
  useVariantCreateController,
  useAuthLogoutController,
  useMaterialListController,
} from '../controllers';
import {
  AuthLogoutUsecase,
  MaterialListUsecase,
  VariantCreateUsecase,
} from '../../domain';
import { VariantFormViewProps } from '../components';
import {
  VariantCreateScreen,
  VariantCreateScreenProps,
} from './VariantCreateScreen';

export type VariantCreateHandlerProps = {
  variantCreateUsecase: VariantCreateUsecase;
  materialListUsecase: MaterialListUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const VariantCreateHandler = ({
  variantCreateUsecase,
  materialListUsecase,
  authLogoutUsecase,
}: VariantCreateHandlerProps) => {
  const router = useRouter();
  const variantCreate = useVariantCreateController(variantCreateUsecase);
  const materialList = useMaterialListController(materialListUsecase);
  const authLogout = useAuthLogoutController(authLogoutUsecase);

  useEffect(() => {
    if (variantCreate.state.type === 'submitSuccess')
      router.push(
        `/products/${variantCreate.state.values.productId}`
      );
  }, [
    variantCreate.state.type,
    router,
    variantCreate.state.values.productId,
  ]);

  return (
    <VariantCreateScreen
      form={variantCreate.form}
      onRetryButtonPress={() => variantCreate.dispatch({ type: 'FETCH' })}
      onSubmit={(values) =>
        variantCreate.dispatch({ type: 'SUBMIT', values })
      }
      isSubmitDisabled={
        variantCreate.state.type === 'submitting' ||
        variantCreate.state.type === 'submitSuccess'
      }
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      isMaterialSheetOpen={variantCreate.isMaterialSheetOpen}
      onMaterialSheetOpenChange={variantCreate.onMaterialSheetOpenChange}
      onAddMaterial={variantCreate.onAddMaterial}
      onRemoveMaterial={variantCreate.onRemoveMaterial}
      variant={match(variantCreate.state)
        .returnType<VariantFormViewProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({
          type: 'loading',
        }))
        .with(
          {
            type: P.union(
              'loaded',
              'submitSuccess',
              'submitError',
              'submitting'
            ),
          },
          () => ({
            type: 'loaded',
          })
        )
        .with({ type: 'error' }, () => ({ type: 'error' }))
        .exhaustive()}
      product={variantCreate.state.product}
      materialList={{
        currentPage: materialList.state.page,
        itemPerPage: materialList.state.itemPerPage,
        onPageChange: (page) =>
          materialList.dispatch({ type: 'CHANGE_PARAMS', page }),
        onRetryButtonPress: () => materialList.dispatch({ type: 'FETCH' }),
        onSearchValueChange: (query) =>
          materialList.dispatch({ type: 'CHANGE_PARAMS', query }),
        searchValue: materialList.state.query,
        totalItem: materialList.state.totalItem,
        variant: match(materialList.state)
          .returnType<
            VariantCreateScreenProps['materialList']['variant']
          >()
          .with({ type: P.union('idle', 'loading') }, () => ({
            type: 'loading',
          }))
          .with(
            { type: P.union('changingParams', 'loaded', 'revalidating') },
            ({ materials }) => ({
              type: materials.length > 0 ? 'loaded' : 'empty',
              items: materials,
            })
          )
          .with({ type: 'error' }, () => ({ type: 'error' }))
          .exhaustive(),
      }}
    />
  );
};
