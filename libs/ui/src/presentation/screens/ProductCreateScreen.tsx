import { ScrollView } from 'tamagui';
import { ProductFormView, Layout, MaterialList } from '../components';
import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useMaterialListController,
  useProductCreateController,
} from '../controllers';
import {
  AuthLogoutUsecase,
  MaterialListUsecase,
  ProductCreateUsecase,
} from '../../domain';

export type ProductCreateScreenProps = {
  productCreateUsecase: ProductCreateUsecase;
  materialListUsecase: MaterialListUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const ProductCreateScreen = (props: ProductCreateScreenProps) => {
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);

  const productCreateController = useProductCreateController(
    props.productCreateUsecase
  );
  const materialListController = useMaterialListController(
    props.materialListUsecase
  );

  const router = useRouter();

  useEffect(() => {
    if (productCreateController.state.type === 'submitSuccess')
      router.push('/products');
  }, [productCreateController.state.type, router]);

  return (
    <Layout {...authLogoutController} title="Create Product" showBackButton>
      <ScrollView>
        <ProductFormView
          {...productCreateController}
          MaterialList={(fieldArray) => (
            <MaterialList
              {...materialListController}
              onItemPress={(material) =>
                productCreateController.onAddMaterial(material, fieldArray)
              }
              isSearchAutoFocus
            />
          )}
        />
      </ScrollView>
    </Layout>
  );
};
