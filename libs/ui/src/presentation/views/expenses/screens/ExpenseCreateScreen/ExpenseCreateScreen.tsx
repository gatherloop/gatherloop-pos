import { ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { ExpenseCreate } from '../../widgets';
import { useExpenseCreateController } from '../../../../controllers';
import { useEffect } from 'react';
import { useRouter } from 'solito/router';

const Content = () => {
  const router = useRouter();
  const expenseCreateController = useExpenseCreateController();

  useEffect(() => {
    if (expenseCreateController.state.type === 'submitSuccess')
      router.push('/expenses');
  }, [expenseCreateController.state.type, router]);

  return (
    <ScrollView>
      <ExpenseCreate />
    </ScrollView>
  );
};

export const ExpenseCreateScreen = () => {
  return (
    <Layout title="Create Expense" showBackButton>
      <Content />
    </Layout>
  );
};
