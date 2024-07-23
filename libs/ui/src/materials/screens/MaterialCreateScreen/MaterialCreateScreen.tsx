import { Card, ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { MaterialForm } from '../../components';
import { useMaterialCreateScreenState } from './MaterialCreateScreen.state';

export const MaterialCreateScreen = () => {
  const { onSuccess } = useMaterialCreateScreenState();
  return (
    <Layout title="Create Material" showBackButton>
      <ScrollView>
        <Card maxWidth={500}>
          <Card.Header>
            <MaterialForm variant={{ type: 'create' }} onSuccess={onSuccess} />
          </Card.Header>
        </Card>
      </ScrollView>
    </Layout>
  );
};
