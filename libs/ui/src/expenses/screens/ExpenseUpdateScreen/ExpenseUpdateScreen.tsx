import { Card, ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { ExpenseForm } from '../../components';
import { useExpenseUpdateScreenState } from './ExpenseUpdateScreen.state';

export type ExpenseUpdateScreenProps = {
  expenseId: number;
};

export const ExpenseUpdateScreen = (props: ExpenseUpdateScreenProps) => {
  const { expenseId, onSuccess } = useExpenseUpdateScreenState({
    expenseId: props.expenseId,
  });
  return (
    <Layout title="Update Expense" showBackButton>
      <ScrollView>
        <ExpenseForm
          variant={{ type: 'update', expenseId }}
          onSuccess={onSuccess}
        />
      </ScrollView>
    </Layout>
  );
};
