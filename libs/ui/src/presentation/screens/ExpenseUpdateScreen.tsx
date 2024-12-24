import { ScrollView } from 'tamagui';
import { ExpenseUpdate, Layout } from '../components';
import { useExpenseUpdateController } from '../controllers';
import { useEffect } from 'react';
import { useRouter } from 'solito/router';
import { ExpenseUpdateUsecase } from '../../domain';

export type ExpenseUpdateScreenProps = {
  expenseUpdateUsecase: ExpenseUpdateUsecase;
};

export const ExpenseUpdateScreen = (props: ExpenseUpdateScreenProps) => {
  const router = useRouter();
  const expenseCreateController = useExpenseUpdateController(
    props.expenseUpdateUsecase
  );

  useEffect(() => {
    if (expenseCreateController.state.type === 'submitSuccess')
      router.push('/expenses');
  }, [expenseCreateController.state.type, router]);

  return (
    <Layout title="Update Expense" showBackButton>
      <ScrollView>
        <ExpenseUpdate {...expenseCreateController} />
      </ScrollView>
    </Layout>
  );
};
