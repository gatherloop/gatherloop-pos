import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import { match, P } from 'ts-pattern';
import { useToastController } from '@tamagui/toast';
import { useUsecase, useAuthLogout, useMaterialList } from '../hooks';
import {
  AuthLogoutUsecase,
  MaterialListUsecase,
  VariantUpdateUsecase,
} from '../../../domain';
import {
  VariantUpdateScreen,
  VariantUpdateScreenProps,
} from '../../views/screens/pos/VariantUpdateScreen';

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
  const variantUpdate = useUsecase(variantUpdateUsecase);
  const materialList = useMaterialList(materialListUsecase);
  const authLogout = useAuthLogout(authLogoutUsecase);
  const toast = useToastController();

  useEffect(() => {
    if (variantUpdate.state.type === 'submitSuccess') {
      toast.show('Update Variant Success');
      router.push(`/products/${variantUpdate.state.values.productId}`);
    } else if (variantUpdate.state.type === 'submitError') {
      toast.show('Update Variant Error');
    }
  }, [
    variantUpdate.state.type,
    router,
    variantUpdate.state.values.productId,
    toast,
  ]);

  return (
    <VariantUpdateScreen
      defaultValues={variantUpdate.state.values}
      onSubmit={(values) => variantUpdate.dispatch({ type: 'SUBMIT', values })}
      isSubmitDisabled={
        variantUpdate.state.type === 'submitting' ||
        variantUpdate.state.type === 'submitSuccess'
      }
      isSubmitting={variantUpdate.state.type === 'submitting'}
      serverError={
        variantUpdate.state.type === 'submitError'
          ? 'Failed to submit. Please try again.'
          : undefined
      }
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
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
        .with({ type: 'error' }, () => ({
          type: 'error',
          onRetryButtonPress: () => variantUpdate.dispatch({ type: 'FETCH' }),
        }))
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
          .returnType<VariantUpdateScreenProps['materialList']['variant']>()
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
