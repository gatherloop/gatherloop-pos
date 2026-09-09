import { useRouter } from 'solito/router';
import {
  AuthLogoutUsecase,
  ProductUpdateUsecase,
  VariantDeleteUsecase,
  Variant,
} from '../../../domain';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { useController } from '../../controllers/controller';
import {
  useAuthLogoutController,
  useVariantDeleteController,
} from '../../controllers';
import {
  ProductUpdateScreen,
  ProductUpdateScreenProps,
} from '../../screens/pos/ProductUpdateScreen';

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
  const productUpdate = useController(productUpdateUsecase);
  const variantDelete = useVariantDeleteController(variantDeleteUsecase);
  const router = useRouter();
  const toast = useToastController();

  useEffect(() => {
    if (productUpdate.state.type === 'submitSuccess') {
      toast.show('Update Product Success');
      router.push('/products');
    } else if (productUpdate.state.type === 'submitError') {
      toast.show('Update Product Error');
    }
  }, [productUpdate.state.type, router, toast]);

  useEffect(() => {
    if (variantDelete.state.type === 'deletingSuccess') {
      productUpdate.dispatch({ type: 'FETCH' });
    }
  }, [variantDelete.state.type, productUpdate]);

  return (
    <ProductUpdateScreen
      defaultValues={productUpdate.state.values}
      onSubmit={(values) =>
        productUpdate.dispatch({ type: 'SUBMIT', values })
      }
      isSubmitDisabled={
        productUpdate.state.type === 'submitting' ||
        productUpdate.state.type === 'submitSuccess'
      }
      isSubmitting={productUpdate.state.type === 'submitting'}
      serverError={
        productUpdate.state.type === 'submitError'
          ? 'Failed to submit. Please try again.'
          : undefined
      }
      variant={match(productUpdate.state)
        .returnType<ProductUpdateScreenProps['variant']>()
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
          onRetryButtonPress: () => productUpdate.dispatch({ type: 'FETCH' }),
        }))
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
