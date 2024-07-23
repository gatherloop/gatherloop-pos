import { Card, ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { ExpenseForm } from '../../components';
import { useExpenseCreateScreenState } from './ExpenseCreateScreen.state';

export const ExpenseCreateScreen = () => {
  const { onSuccess } = useExpenseCreateScreenState();
  return (
    <Layout title="Create Expense" showBackButton>
      <ScrollView>
        <ExpenseForm variant={{ type: 'create' }} onSuccess={onSuccess} />
      </ScrollView>
    </Layout>
  );
};
