import { ScrollView } from 'tamagui';
import { MaterialFormView, Layout } from '../components';
import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useMaterialCreateController,
} from '../controllers';
import { AuthLogoutUsecase, MaterialCreateUsecase } from '../../domain';

export type MaterialCreateScreenProps = {
  materialCreateUsecase: MaterialCreateUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const MaterialCreateScreen = (props: MaterialCreateScreenProps) => {
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);
  const materialCreateController = useMaterialCreateController(
    props.materialCreateUsecase
  );
  const router = useRouter();

  useEffect(() => {
    if (materialCreateController.state.type === 'submitSuccess')
      router.push('/materials');
  }, [materialCreateController.state.type, router]);

  return (
    <Layout {...authLogoutController} title="Create Material" showBackButton>
      <ScrollView>
        <MaterialFormView {...materialCreateController} />
      </ScrollView>
    </Layout>
  );
};
