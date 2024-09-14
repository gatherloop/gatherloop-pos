import { ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { BudgetList } from '../../components';

export const BudgetListScreen = () => {
  return (
    <Layout title="Budgets">
      <BudgetList />
    </Layout>
  );
};
