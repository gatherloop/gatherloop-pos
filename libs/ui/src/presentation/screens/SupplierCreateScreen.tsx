import { ScrollView } from 'tamagui';
import { SupplierFormView, Layout } from '../components';
import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useSupplierCreateController,
} from '../controllers';
import { AuthLogoutUsecase, SupplierCreateUsecase } from '../../domain';

export type SupplierCreateScreenProps = {
  supplierCreateUsecase: SupplierCreateUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const SupplierCreateScreen = (props: SupplierCreateScreenProps) => {
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);
  const supplierCreateController = useSupplierCreateController(
    props.supplierCreateUsecase
  );
  const router = useRouter();

  useEffect(() => {
    if (supplierCreateController.state.type === 'submitSuccess')
      router.push('/suppliers');
  }, [supplierCreateController.state.type, router]);

  return (
    <Layout {...authLogoutController} title="Create Supplier" showBackButton>
      <ScrollView>
        <SupplierFormView {...supplierCreateController} />
      </ScrollView>
    </Layout>
  );
};
