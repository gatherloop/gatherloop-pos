import { ScrollView } from 'tamagui';
import { ExpenseCreate, Layout } from '../components';
import { useExpenseCreateController } from '../controllers';
import { useEffect } from 'react';
import { useRouter } from 'solito/router';
import { ExpenseCreateUsecase } from '../../domain';

export type ExpenseCreateScreenProps = {
  expenseCreateUsecase: ExpenseCreateUsecase;
};

export const ExpenseCreateScreen = (props: ExpenseCreateScreenProps) => {
  const router = useRouter();
  const expenseCreateController = useExpenseCreateController(
    props.expenseCreateUsecase
  );

  useEffect(() => {
    if (expenseCreateController.state.type === 'submitSuccess')
      router.push('/expenses');
  }, [expenseCreateController.state.type, router]);

  return (
    <Layout title="Create Expense" showBackButton>
      <ScrollView>
        <ExpenseCreate {...expenseCreateController} />
      </ScrollView>
    </Layout>
  );
};
