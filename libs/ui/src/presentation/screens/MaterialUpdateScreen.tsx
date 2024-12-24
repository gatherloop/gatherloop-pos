import { ScrollView } from 'tamagui';
import { MaterialUpdate, Layout } from '../components';
import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import { useMaterialUpdateController } from '../controllers';
import { MaterialUpdateUsecase } from '../../domain';

export type MaterialUpdateScreenProps = {
  materialUpdateUsecase: MaterialUpdateUsecase;
};

export const MaterialUpdateScreen = (props: MaterialUpdateScreenProps) => {
  const controller = useMaterialUpdateController(props.materialUpdateUsecase);
  const router = useRouter();

  useEffect(() => {
    if (controller.state.type === 'submitSuccess') router.push('/materials');
  }, [controller.state.type, router]);

  return (
    <Layout title="Update Material" showBackButton>
      <ScrollView>
        <MaterialUpdate {...controller} />
      </ScrollView>
    </Layout>
  );
};
