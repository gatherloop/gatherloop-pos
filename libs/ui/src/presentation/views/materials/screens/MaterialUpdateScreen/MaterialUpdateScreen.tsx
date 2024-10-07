import { ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { MaterialUpdate } from '../../widgets';
import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import { useMaterialUpdateController } from '../../../../controllers';

const Content = () => {
  const controller = useMaterialUpdateController();
  const router = useRouter();

  useEffect(() => {
    if (controller.state.type === 'submitSuccess') router.push('/materials');
  }, [controller.state.type, router]);

  return (
    <ScrollView>
      <MaterialUpdate />
    </ScrollView>
  );
};

export const MaterialUpdateScreen = () => {
  return (
    <Layout title="Update Material" showBackButton>
      <Content />
    </Layout>
  );
};
