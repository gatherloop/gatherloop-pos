import { ScrollView } from 'tamagui';
import { ProductFormView, Layout } from '../components';
import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useProductCreateController,
} from '../controllers';
import { AuthLogoutUsecase, ProductCreateUsecase } from '../../domain';

export type ProductCreateScreenProps = {
  productCreateUsecase: ProductCreateUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const ProductCreateScreen = (props: ProductCreateScreenProps) => {
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);

  const productCreateController = useProductCreateController(
    props.productCreateUsecase
  );

  const router = useRouter();

  useEffect(() => {
    if (productCreateController.state.type === 'submitSuccess')
      router.push('/products');
  }, [productCreateController.state.type, router]);

  return (
    <Layout {...authLogoutController} title="Create Product" showBackButton>
      <ScrollView>
        <ProductFormView {...productCreateController} />
      </ScrollView>
    </Layout>
  );
};
