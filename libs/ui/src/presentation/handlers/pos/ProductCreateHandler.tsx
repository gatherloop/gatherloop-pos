import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, ProductCreateUsecase } from '../../../domain';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { useUsecase, useAuthLogout } from '../hooks';
import {
  ProductCreateScreen,
  ProductCreateScreenProps,
} from '../../views/screens/pos/ProductCreateScreen';

export type ProductCreateHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  productCreateUsecase: ProductCreateUsecase;
};

export const ProductCreateHandler = ({
  authLogoutUsecase,
  productCreateUsecase,
}: ProductCreateHandlerProps) => {
  const authLogout = useAuthLogout(authLogoutUsecase);
  const productCreate = useUsecase(productCreateUsecase);
  const router = useRouter();
  const toast = useToastController();

  useEffect(() => {
    if (productCreate.state.type === 'submitSuccess') {
      toast.show('Create Product Success');
      router.push('/products');
    } else if (productCreate.state.type === 'submitError') {
      toast.show('Create Product Error');
    }
  }, [productCreate.state.type, router, toast]);

  return (
    <ProductCreateScreen
      defaultValues={productCreate.state.values}
      onSubmit={(values) =>
        productCreate.dispatch({ type: 'SUBMIT', values })
      }
      isSubmitDisabled={
        productCreate.state.type === 'submitting' ||
        productCreate.state.type === 'submitSuccess'
      }
      isSubmitting={productCreate.state.type === 'submitting'}
      serverError={
        productCreate.state.type === 'submitError'
          ? 'Failed to submit. Please try again.'
          : undefined
      }
      variant={match(productCreate.state)
        .returnType<ProductCreateScreenProps['variant']>()
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
          () => ({ type: 'loaded' })
        )
        .with({ type: 'error' }, () => ({
          type: 'error',
          onRetryButtonPress: () => productCreate.dispatch({ type: 'FETCH' }),
        }))
        .exhaustive()}
      categorySelectOptions={productCreate.state.categories.map((category) => ({
        label: category.name,
        value: category.id,
      }))}
      variants={[]}
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
    />
  );
};
