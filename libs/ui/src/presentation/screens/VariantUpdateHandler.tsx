import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import { match, P } from 'ts-pattern';
import {
  useVariantUpdateController,
  useAuthLogoutController,
  useMaterialListController,
} from '../controllers';
import {
  AuthLogoutUsecase,
  MaterialListUsecase,
  VariantUpdateUsecase,
} from '../../domain';
import {
  VariantUpdateScreen,
  VariantUpdateScreenProps,
} from './VariantUpdateScreen';

export type VariantUpdateHandlerProps = {
  variantUpdateUsecase: VariantUpdateUsecase;
  materialListUsecase: MaterialListUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const VariantUpdateHandler = ({
  variantUpdateUsecase,
  materialListUsecase,
  authLogoutUsecase,
}: VariantUpdateHandlerProps) => {
  const router = useRouter();
  const variantUpdate = useVariantUpdateController(variantUpdateUsecase);
  const materialList = useMaterialListController(materialListUsecase);
  const authLogout = useAuthLogoutController(authLogoutUsecase);

  useEffect(() => {
    if (variantUpdate.state.type === 'submitSuccess')
      router.push(
        `/products/${variantUpdate.state.values.productId}`
      );
  }, [
    variantUpdate.state.type,
    router,
    variantUpdate.state.values.productId,
  ]);

  return (
    <VariantUpdateScreen
      form={variantUpdate.form}
      onRetryButtonPress={() => variantUpdate.dispatch({ type: 'FETCH' })}
      onSubmit={(values) =>
        variantUpdate.dispatch({ type: 'SUBMIT', values })
      }
      isSubmitDisabled={
        variantUpdate.state.type === 'submitting' ||
        variantUpdate.state.type === 'submitSuccess'
      }
      isSubmitting={variantUpdate.state.type === 'submitting'}
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      isMaterialSheetOpen={variantUpdate.isMaterialSheetOpen}
      onMaterialSheetOpenChange={variantUpdate.onMaterialSheetOpenChange}
      onAddMaterial={variantUpdate.onAddMaterial}
      onRemoveMaterial={variantUpdate.onRemoveMaterial}
      variant={match(variantUpdate.state)
        .returnType<VariantUpdateScreenProps['variant']>()
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
      product={variantUpdate.state.product}
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
            VariantUpdateScreenProps['materialList']['variant']
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
