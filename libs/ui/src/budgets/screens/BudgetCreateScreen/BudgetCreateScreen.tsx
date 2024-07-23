import { Card, ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { BudgetForm } from '../../components';
import { useBudgetCreateScreenState } from './BudgetCreateScreen.state';

export const BudgetCreateScreen = () => {
  const { onSuccess } = useBudgetCreateScreenState();
  return (
    <Layout title="Create Budget" showBackButton>
      <ScrollView>
        <Card maxWidth={500}>
          <Card.Header>
            <BudgetForm variant={{ type: 'create' }} onSuccess={onSuccess} />
          </Card.Header>
        </Card>
      </ScrollView>
    </Layout>
  );
};
