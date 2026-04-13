import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, ProductCreateUsecase } from '../../domain';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useProductCreateController,
} from '../controllers';
import {
  ProductCreateScreen,
  ProductCreateScreenProps,
} from './ProductCreateScreen';

export type ProductCreateHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  productCreateUsecase: ProductCreateUsecase;
};

export const ProductCreateHandler = ({
  authLogoutUsecase,
  productCreateUsecase,
}: ProductCreateHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const productCreate = useProductCreateController(productCreateUsecase);
  const router = useRouter();

  useEffect(() => {
    if (productCreate.state.type === 'submitSuccess') {
      router.push('/products');
    }
  }, [productCreate.state.type, router]);

  return (
    <ProductCreateScreen
      form={productCreate.form}
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
      onRetryButtonPress={() => productCreate.dispatch({ type: 'FETCH' })}
      variant={match(productCreate.state)
        .returnType<ProductCreateScreenProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
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
        .with({ type: 'error' }, () => ({ type: 'error' }))
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
