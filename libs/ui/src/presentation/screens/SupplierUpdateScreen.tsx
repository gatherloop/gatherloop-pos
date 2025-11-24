import { ScrollView } from 'tamagui';
import { SupplierFormView, Layout } from '../components';
import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useSupplierUpdateController,
} from '../controllers';
import { AuthLogoutUsecase, SupplierUpdateUsecase } from '../../domain';

export type SupplierUpdateScreenProps = {
  supplierUpdateUsecase: SupplierUpdateUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const SupplierUpdateScreen = (props: SupplierUpdateScreenProps) => {
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);

  const supplierUpdateController = useSupplierUpdateController(
    props.supplierUpdateUsecase
  );
  const router = useRouter();

  useEffect(() => {
    if (supplierUpdateController.state.type === 'submitSuccess')
      router.push('/suppliers');
  }, [supplierUpdateController.state.type, router]);

  return (
    <Layout {...authLogoutController} title="Update Supplier" showBackButton>
      <ScrollView>
        <SupplierFormView {...supplierUpdateController} />
      </ScrollView>
    </Layout>
  );
};
