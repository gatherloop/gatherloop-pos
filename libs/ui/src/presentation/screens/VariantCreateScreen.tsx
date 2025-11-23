import { ScrollView } from 'tamagui';
import { VariantFormView, Layout, MaterialList } from '../components';
import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useMaterialListController,
  useVariantCreateController,
} from '../controllers';
import {
  AuthLogoutUsecase,
  MaterialListUsecase,
  VariantCreateUsecase,
} from '../../domain';

export type VariantCreateScreenProps = {
  variantCreateUsecase: VariantCreateUsecase;
  materialListUsecase: MaterialListUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const VariantCreateScreen = (props: VariantCreateScreenProps) => {
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);

  const variantCreateController = useVariantCreateController(
    props.variantCreateUsecase
  );
  const materialListController = useMaterialListController(
    props.materialListUsecase
  );

  const router = useRouter();

  useEffect(() => {
    if (variantCreateController.state.type === 'submitSuccess')
      router.push(
        `/products/${variantCreateController.state.values.productId}`
      );
  }, [
    variantCreateController.state.type,
    router,
    variantCreateController.state.values.productId,
  ]);

  return (
    <Layout
      {...authLogoutController}
      title={`Create ${variantCreateController.product?.name} Variant`}
      showBackButton
    >
      <ScrollView>
        <VariantFormView
          {...variantCreateController}
          MaterialList={(fieldArray) => (
            <MaterialList
              {...materialListController}
              onItemPress={(material) =>
                variantCreateController.onAddMaterial(material, fieldArray)
              }
              isSearchAutoFocus
            />
          )}
        />
      </ScrollView>
    </Layout>
  );
};
