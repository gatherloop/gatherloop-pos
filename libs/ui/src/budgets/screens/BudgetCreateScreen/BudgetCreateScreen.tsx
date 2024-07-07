import { H3, Paragraph, YStack, ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { BudgetForm } from '../../components';
import { useBudgetCreateScreenState } from './BudgetCreateScreen.state';

export const BudgetCreateScreen = () => {
  const { onSuccess } = useBudgetCreateScreenState();
  return (
    <Layout>
      <YStack>
        <H3>Create Budget</H3>
        <Paragraph>Make a new budget</Paragraph>
      </YStack>
      <ScrollView>
        <BudgetForm variant={{ type: 'create' }} onSuccess={onSuccess} />
      </ScrollView>
    </Layout>
  );
};
