import { Card, ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { MaterialForm } from '../../components';
import { useMaterialUpdateScreenState } from './MaterialUpdateScreen.state';

export type MaterialUpdateScreenProps = {
  materialId: number;
};

export const MaterialUpdateScreen = (props: MaterialUpdateScreenProps) => {
  const { materialId, onSuccess } = useMaterialUpdateScreenState({
    materialId: props.materialId,
  });
  return (
    <Layout title="Update Material" showBackButton>
      <ScrollView>
        <Card maxWidth={500}>
          <Card.Header>
            <MaterialForm
              variant={{ type: 'update', materialId }}
              onSuccess={onSuccess}
            />
          </Card.Header>
        </Card>
      </ScrollView>
    </Layout>
  );
};
