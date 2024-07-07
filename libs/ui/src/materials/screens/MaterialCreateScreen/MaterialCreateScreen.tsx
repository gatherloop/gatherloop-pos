import { ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { MaterialForm } from '../../components';
import { useMaterialCreateScreenState } from './MaterialCreateScreen.state';

export const MaterialCreateScreen = () => {
  const { onSuccess } = useMaterialCreateScreenState();
  return (
    <Layout title="Create Material" showBackButton>
      <ScrollView>
        <MaterialForm variant={{ type: 'create' }} onSuccess={onSuccess} />
      </ScrollView>
    </Layout>
  );
};
