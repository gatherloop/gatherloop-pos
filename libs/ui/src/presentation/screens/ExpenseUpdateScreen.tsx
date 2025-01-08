import { ScrollView } from 'tamagui';
import { ExpenseUpdate, Layout } from '../components';
import {
  useAuthLogoutController,
  useExpenseUpdateController,
} from '../controllers';
import { useEffect } from 'react';
import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, ExpenseUpdateUsecase } from '../../domain';

export type ExpenseUpdateScreenProps = {
  expenseUpdateUsecase: ExpenseUpdateUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const ExpenseUpdateScreen = (props: ExpenseUpdateScreenProps) => {
  const router = useRouter();
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);
  const expenseCreateController = useExpenseUpdateController(
    props.expenseUpdateUsecase
  );

  useEffect(() => {
    if (expenseCreateController.state.type === 'submitSuccess')
      router.push('/expenses');
  }, [expenseCreateController.state.type, router]);

  return (
    <Layout {...authLogoutController} title="Update Expense" showBackButton>
      <ScrollView>
        <ExpenseUpdate {...expenseCreateController} />
      </ScrollView>
    </Layout>
  );
};
