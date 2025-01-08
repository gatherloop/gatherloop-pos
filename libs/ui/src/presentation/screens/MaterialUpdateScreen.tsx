import { ScrollView } from 'tamagui';
import { MaterialUpdate, Layout } from '../components';
import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useMaterialUpdateController,
} from '../controllers';
import { AuthLogoutUsecase, MaterialUpdateUsecase } from '../../domain';

export type MaterialUpdateScreenProps = {
  materialUpdateUsecase: MaterialUpdateUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const MaterialUpdateScreen = (props: MaterialUpdateScreenProps) => {
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);

  const controller = useMaterialUpdateController(props.materialUpdateUsecase);
  const router = useRouter();

  useEffect(() => {
    if (controller.state.type === 'submitSuccess') router.push('/materials');
  }, [controller.state.type, router]);

  return (
    <Layout {...authLogoutController} title="Update Material" showBackButton>
      <ScrollView>
        <MaterialUpdate {...controller} />
      </ScrollView>
    </Layout>
  );
};
