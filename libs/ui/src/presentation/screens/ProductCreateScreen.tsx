import { ScrollView } from 'tamagui';
import { ProductCreate, Layout, MaterialList } from '../components';
import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import {
  useMaterialListController,
  useProductCreateController,
} from '../controllers';
import { MaterialListUsecase, ProductCreateUsecase } from '../../domain';

export type ProductCreateScreenProps = {
  productCreateUsecase: ProductCreateUsecase;
  materialListUsecase: MaterialListUsecase;
};

export const ProductCreateScreen = (props: ProductCreateScreenProps) => {
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
    <Layout title="Create Product" showBackButton>
      <ScrollView>
        <ProductCreate
          {...productCreateController}
          MaterialList={
            <MaterialList
              {...materialListController}
              onItemPress={productCreateController.onAddMaterial}
              isSearchAutoFocus
            />
          }
        />
      </ScrollView>
    </Layout>
  );
};
