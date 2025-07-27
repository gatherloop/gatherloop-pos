import { ScrollView } from 'tamagui';
import { VariantFormView, Layout, MaterialList } from '../components';
import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useMaterialListController,
  useVariantUpdateController,
} from '../controllers';
import {
  AuthLogoutUsecase,
  MaterialListUsecase,
  VariantUpdateUsecase,
} from '../../domain';

export type VariantUpdateScreenProps = {
  variantUpdateUsecase: VariantUpdateUsecase;
  materialListUsecase: MaterialListUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const VariantUpdateScreen = (props: VariantUpdateScreenProps) => {
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);

  const variantUpdateController = useVariantUpdateController(
    props.variantUpdateUsecase
  );
  const materialListController = useMaterialListController(
    props.materialListUsecase
  );

  const router = useRouter();

  useEffect(() => {
    if (variantUpdateController.state.type === 'submitSuccess')
      router.push('/variants');
  }, [variantUpdateController.state.type, router]);

  return (
    <Layout {...authLogoutController} title="Update Variant" showBackButton>
      <ScrollView>
        <VariantFormView
          {...variantUpdateController}
          MaterialList={(fieldArray) => (
            <MaterialList
              {...materialListController}
              onItemPress={(material) =>
                variantUpdateController.onAddMaterial(material, fieldArray)
              }
              isSearchAutoFocus
            />
          )}
        />
      </ScrollView>
    </Layout>
  );
};
