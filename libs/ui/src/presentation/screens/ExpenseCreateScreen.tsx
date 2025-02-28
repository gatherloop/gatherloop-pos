import { ScrollView } from 'tamagui';
import { ExpenseFormView, Layout } from '../components';
import {
  useAuthLogoutController,
  useExpenseCreateController,
} from '../controllers';
import { useEffect } from 'react';
import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, ExpenseCreateUsecase } from '../../domain';

export type ExpenseCreateScreenProps = {
  expenseCreateUsecase: ExpenseCreateUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const ExpenseCreateScreen = (props: ExpenseCreateScreenProps) => {
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);
  const router = useRouter();
  const expenseCreateController = useExpenseCreateController(
    props.expenseCreateUsecase
  );

  useEffect(() => {
    if (expenseCreateController.state.type === 'submitSuccess')
      router.push('/expenses');
  }, [expenseCreateController.state.type, router]);

  return (
    <Layout {...authLogoutController} title="Create Expense" showBackButton>
      <ScrollView>
        <ExpenseFormView {...expenseCreateController} />
      </ScrollView>
    </Layout>
  );
};
