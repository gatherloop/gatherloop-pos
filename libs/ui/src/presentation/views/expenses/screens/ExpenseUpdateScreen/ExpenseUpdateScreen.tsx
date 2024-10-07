import { ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { ExpenseUpdate } from '../../widgets';
import { useExpenseUpdateController } from '../../../../controllers';
import { useEffect } from 'react';
import { useRouter } from 'solito/router';

const Content = () => {
  const router = useRouter();
  const expenseCreateController = useExpenseUpdateController();

  useEffect(() => {
    if (expenseCreateController.state.type === 'submitSuccess')
      router.push('/expenses');
  }, [expenseCreateController.state.type, router]);

  return (
    <ScrollView>
      <ExpenseUpdate />
    </ScrollView>
  );
};

export const ExpenseUpdateScreen = () => {
  return (
    <Layout title="Update Expense" showBackButton>
      <Content />
    </Layout>
  );
};
