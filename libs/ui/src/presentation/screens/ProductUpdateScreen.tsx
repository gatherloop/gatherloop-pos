import { ScrollView } from 'tamagui';
import { ProductUpdate, Layout, MaterialList } from '../components';
import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useMaterialListController,
  useProductUpdateController,
} from '../controllers';
import {
  AuthLogoutUsecase,
  MaterialListUsecase,
  ProductUpdateUsecase,
} from '../../domain';

export type ProductUpdateScreenProps = {
  productUpdateUsecase: ProductUpdateUsecase;
  materialListUsecase: MaterialListUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const ProductUpdateScreen = (props: ProductUpdateScreenProps) => {
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);

  const productUpdateController = useProductUpdateController(
    props.productUpdateUsecase
  );
  const materialListController = useMaterialListController(
    props.materialListUsecase
  );

  const router = useRouter();

  useEffect(() => {
    if (productUpdateController.state.type === 'submitSuccess')
      router.push('/products');
  }, [productUpdateController.state.type, router]);

  return (
    <Layout {...authLogoutController} title="Update Product" showBackButton>
      <ScrollView>
        <ProductUpdate
          {...productUpdateController}
          MaterialList={
            <MaterialList
              {...materialListController}
              onItemPress={productUpdateController.onAddMaterial}
              isSearchAutoFocus
            />
          }
        />
      </ScrollView>
    </Layout>
  );
};
