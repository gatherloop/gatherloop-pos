import { ScrollView } from 'tamagui';
import { MaterialCreate, Layout } from '../components';
import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import { useMaterialCreateController } from '../controllers';
import { MaterialCreateUsecase } from '../../domain';

export type MaterialCreateScreenProps = {
  materialCreateUsecase: MaterialCreateUsecase;
};

export const MaterialCreateScreen = (props: MaterialCreateScreenProps) => {
  const controller = useMaterialCreateController(props.materialCreateUsecase);
  const router = useRouter();

  useEffect(() => {
    if (controller.state.type === 'submitSuccess') router.push('/materials');
  }, [controller.state.type, router]);

  return (
    <Layout title="Create Material" showBackButton>
      <ScrollView>
        <MaterialCreate {...controller} />
      </ScrollView>
    </Layout>
  );
};
