import { ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { MaterialCreate } from '../../widgets';
import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import { useMaterialCreateController } from '../../../../controllers';

const Content = () => {
  const controller = useMaterialCreateController();
  const router = useRouter();

  useEffect(() => {
    if (controller.state.type === 'submitSuccess') router.push('/materials');
  }, [controller.state.type, router]);

  return (
    <ScrollView>
      <MaterialCreate />
    </ScrollView>
  );
};

export const MaterialCreateScreen = () => {
  return (
    <Layout title="Create Material" showBackButton>
      <Content />
    </Layout>
  );
};
