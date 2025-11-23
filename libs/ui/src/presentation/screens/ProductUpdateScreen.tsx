import { ScrollView } from 'tamagui';
import { ProductFormView, Layout, VariantDeleteAlert } from '../components';
import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useProductUpdateController,
  useVariantDeleteController,
} from '../controllers';
import {
  AuthLogoutUsecase,
  ProductUpdateUsecase,
  Variant,
  VariantDeleteUsecase,
} from '../../domain';

export type ProductUpdateScreenProps = {
  productUpdateUsecase: ProductUpdateUsecase;
  variantDeleteUsecase: VariantDeleteUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const ProductUpdateScreen = (props: ProductUpdateScreenProps) => {
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);

  const productUpdateController = useProductUpdateController(
    props.productUpdateUsecase
  );

  const variantDeleteController = useVariantDeleteController(
    props.variantDeleteUsecase
  );

  const router = useRouter();

  useEffect(() => {
    if (productUpdateController.state.type === 'submitSuccess')
      router.push('/products');
  }, [productUpdateController.state.type, router]);

  useEffect(() => {
    if (variantDeleteController.state.type === 'deletingSuccess')
      productUpdateController.dispatch({ type: 'FETCH' });
  }, [productUpdateController, variantDeleteController.state.type]);

  const onVariantDeleteMenuPress = (variant: Variant) => {
    variantDeleteController.dispatch({
      type: 'SHOW_CONFIRMATION',
      variantId: variant.id,
    });
  };

  const onVariantEditMenuPress = (variant: Variant) => {
    router.push(`/products/${variant.product.id}/variants/${variant.id}`);
  };

  const onVariantPress = (variant: Variant) => {
    router.push(`/products/${variant.product.id}/variants/${variant.id}`);
  };

  const onVariantCreatePress = () => {
    router.push(
      `/products/${props.productUpdateUsecase.params.productId}/variants/create`
    );
  };

  return (
    <Layout {...authLogoutController} title="Update Product" showBackButton>
      <ScrollView>
        <ProductFormView
          {...productUpdateController}
          onVariantPress={onVariantPress}
          onVariantDeleteMenuPress={onVariantDeleteMenuPress}
          onVariantEditMenuPress={onVariantEditMenuPress}
          onVariantCreatePress={onVariantCreatePress}
        />
        <VariantDeleteAlert {...variantDeleteController} />
      </ScrollView>
    </Layout>
  );
};
