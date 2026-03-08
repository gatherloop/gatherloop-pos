import { useRouter } from 'solito/router';
import {
  AuthLogoutUsecase,
  ProductUpdateUsecase,
  VariantDeleteUsecase,
  Variant,
} from '../../domain';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useProductUpdateController,
  useVariantDeleteController,
} from '../controllers';
import {
  ProductUpdateScreen,
  ProductUpdateScreenProps,
} from './ProductUpdateScreen';

export type ProductUpdateHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  productUpdateUsecase: ProductUpdateUsecase;
  variantDeleteUsecase: VariantDeleteUsecase;
};

export const ProductUpdateHandler = ({
  authLogoutUsecase,
  productUpdateUsecase,
  variantDeleteUsecase,
}: ProductUpdateHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const productUpdate = useProductUpdateController(productUpdateUsecase);
  const variantDelete = useVariantDeleteController(variantDeleteUsecase);
  const router = useRouter();

  useEffect(() => {
    if (productUpdate.state.type === 'submitSuccess') {
      router.push('/products');
    }
  }, [productUpdate.state.type, router]);

  useEffect(() => {
    if (variantDelete.state.type === 'deletingSuccess') {
      productUpdate.dispatch({ type: 'FETCH' });
    }
  }, [variantDelete.state.type, productUpdate]);

  return (
    <ProductUpdateScreen
      form={productUpdate.form}
      onSubmit={(values) =>
        productUpdate.dispatch({ type: 'SUBMIT', values })
      }
      isSubmitDisabled={
        productUpdate.state.type === 'submitting' ||
        productUpdate.state.type === 'submitSuccess'
      }
      onRetryButtonPress={() => productUpdate.dispatch({ type: 'FETCH' })}
      variant={match(productUpdate.state)
        .returnType<ProductUpdateScreenProps['variant']>()
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
      categorySelectOptions={productUpdate.state.categories.map((category) => ({
        label: category.name,
        value: category.id,
      }))}
      variants={productUpdate.state.variants}
      onVariantDeleteMenuPress={(variant: Variant) =>
        variantDelete.dispatch({
          type: 'SHOW_CONFIRMATION',
          variantId: variant.id,
        })
      }
      onVariantEditMenuPress={(variant: Variant) =>
        router.push(`/products/${variant.product.id}/variants/${variant.id}`)
      }
      onVariantPress={(variant: Variant) =>
        router.push(`/products/${variant.product.id}/variants/${variant.id}`)
      }
      onVariantCreatePress={() =>
        router.push(
          `/products/${productUpdateUsecase.params.productId}/variants/create`
        )
      }
      variantDeleteAlert={{
        isOpen: match(variantDelete.state.type)
          .with(
            P.union('shown', 'deleting', 'deletingError', 'deletingSuccess'),
            () => true
          )
          .otherwise(() => false),
        onCancel: () =>
          variantDelete.dispatch({ type: 'HIDE_CONFIRMATION' }),
        onConfirm: () => variantDelete.dispatch({ type: 'DELETE' }),
        isButtonDisabled:
          variantDelete.state.type === 'deleting' ||
          variantDelete.state.type === 'deletingSuccess',
      }}
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
    />
  );
};
