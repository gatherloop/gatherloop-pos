import { ScrollView } from 'tamagui';
import { MaterialCreate, Layout } from '../components';
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
  const controller = useMaterialCreateController(props.materialCreateUsecase);
  const router = useRouter();

  useEffect(() => {
    if (controller.state.type === 'submitSuccess') router.push('/materials');
  }, [controller.state.type, router]);

  return (
    <Layout {...authLogoutController} title="Create Material" showBackButton>
      <ScrollView>
        <MaterialCreate {...controller} />
      </ScrollView>
    </Layout>
  );
};
