import { H3, Paragraph, ScrollView, YStack } from 'tamagui';
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
    <Layout>
      <YStack>
        <H3>Update Material</H3>
        <Paragraph>Update your existing material</Paragraph>
      </YStack>
      <ScrollView>
        <MaterialForm
          variant={{ type: 'update', materialId }}
          onSuccess={onSuccess}
        />
      </ScrollView>
    </Layout>
  );
};
