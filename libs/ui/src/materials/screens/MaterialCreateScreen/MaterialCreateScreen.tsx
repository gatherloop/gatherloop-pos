import { H3, Paragraph, YStack, ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { MaterialForm } from '../../components';
import { useMaterialCreateScreenState } from './MaterialCreateScreen.state';

export const MaterialCreateScreen = () => {
  const { onSuccess } = useMaterialCreateScreenState();
  return (
    <Layout>
      <YStack>
        <H3>Create Material</H3>
        <Paragraph>Make a new material</Paragraph>
      </YStack>
      <ScrollView>
        <MaterialForm variant={{ type: 'create' }} onSuccess={onSuccess} />
      </ScrollView>
    </Layout>
  );
};
