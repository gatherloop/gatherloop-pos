import { ScrollView } from 'tamagui';
import { ProductUpdate, Layout, MaterialList } from '../components';
import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import {
  useMaterialListController,
  useProductUpdateController,
} from '../controllers';
import { MaterialListUsecase, ProductUpdateUsecase } from '../../domain';

export type ProductUpdateScreenProps = {
  productUpdateUsecase: ProductUpdateUsecase;
  materialListUsecase: MaterialListUsecase;
};

export const ProductUpdateScreen = (props: ProductUpdateScreenProps) => {
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
    <Layout title="Update Product" showBackButton>
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
