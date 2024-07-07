import { H3, Paragraph, ScrollView, YStack } from 'tamagui';
import { Layout } from '../../../base';
import { BudgetForm } from '../../components';
import { useBudgetUpdateScreenState } from './BudgetUpdateScreen.state';

export type BudgetUpdateScreenProps = {
  budgetId: number;
};

export const BudgetUpdateScreen = (props: BudgetUpdateScreenProps) => {
  const { budgetId, onSuccess } = useBudgetUpdateScreenState({
    budgetId: props.budgetId,
  });
  return (
    <Layout>
      <YStack>
        <H3>Update Budget</H3>
        <Paragraph>Update your existing Budget</Paragraph>
      </YStack>
      <ScrollView>
        <BudgetForm
          variant={{ type: 'update', budgetId }}
          onSuccess={onSuccess}
        />
      </ScrollView>
    </Layout>
  );
};
