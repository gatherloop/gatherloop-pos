import { ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { BudgetForm } from '../../components';
import { useBudgetCreateScreenState } from './BudgetCreateScreen.state';

export const BudgetCreateScreen = () => {
  const { onSuccess } = useBudgetCreateScreenState();
  return (
    <Layout title="Create Budget" showBackButton>
      <ScrollView>
        <BudgetForm variant={{ type: 'create' }} onSuccess={onSuccess} />
      </ScrollView>
    </Layout>
  );
};
