import { ScrollView } from 'tamagui';
import { ProductFormView, Layout } from '../components';
import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useProductUpdateController,
} from '../controllers';
import { AuthLogoutUsecase, ProductUpdateUsecase } from '../../domain';

export type ProductUpdateScreenProps = {
  productUpdateUsecase: ProductUpdateUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const ProductUpdateScreen = (props: ProductUpdateScreenProps) => {
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);

  const productUpdateController = useProductUpdateController(
    props.productUpdateUsecase
  );

  const router = useRouter();

  useEffect(() => {
    if (productUpdateController.state.type === 'submitSuccess')
      router.push('/products');
  }, [productUpdateController.state.type, router]);

  return (
    <Layout {...authLogoutController} title="Update Product" showBackButton>
      <ScrollView>
        <ProductFormView {...productUpdateController} />
      </ScrollView>
    </Layout>
  );
};
