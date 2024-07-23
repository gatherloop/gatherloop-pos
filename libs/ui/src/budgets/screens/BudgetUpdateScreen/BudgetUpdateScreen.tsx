import { Card, ScrollView } from 'tamagui';
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
    <Layout title="Update Budget" showBackButton>
      <ScrollView>
        <Card maxWidth={500}>
          <Card.Header>
            <BudgetForm
              variant={{ type: 'update', budgetId }}
              onSuccess={onSuccess}
            />
          </Card.Header>
        </Card>
      </ScrollView>
    </Layout>
  );
};
