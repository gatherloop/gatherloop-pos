import { Button } from 'tamagui';
import { ExpenseList, ExpenseDeleteAlert, Layout } from '../components';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import {
  useAuthLogoutController,
  useExpenseDeleteController,
  useExpenseListController,
} from '../controllers';
import {
  AuthLogoutUsecase,
  Expense,
  ExpenseDeleteUsecase,
  ExpenseListUsecase,
} from '../../domain';
import { useRouter } from 'solito/router';
import { useEffect } from 'react';

export type ExpenseListScreenProps = {
  expenseListUsecase: ExpenseListUsecase;
  expenseDeleteUsecase: ExpenseDeleteUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const ExpenseListScreen = (props: ExpenseListScreenProps) => {
  const router = useRouter();

  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);

  const expenseListController = useExpenseListController(
    props.expenseListUsecase
  );
  const expenseDeleteController = useExpenseDeleteController(
    props.expenseDeleteUsecase
  );

  useEffect(() => {
    if (expenseDeleteController.state.type === 'deletingSuccess') {
      expenseListController.dispatch({ type: 'FETCH' });
    }
  }, [expenseDeleteController.state.type, expenseListController]);

  const onDeleteMenuPress = (expense: Expense) => {
    expenseDeleteController.dispatch({
      type: 'SHOW_CONFIRMATION',
      expenseId: expense.id,
    });
  };

  const onEditMenuPress = (expense: Expense) => {
    router.push(`/expenses/${expense.id}`);
  };

  const onItemPress = (expense: Expense) => {
    router.push(`/expenses/${expense.id}`);
  };

  return (
    <Layout
      {...authLogoutController}
      title="Expenses"
      rightActionItem={
        <Link href="/expenses/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <ExpenseList
        {...expenseListController}
        onDeleteMenuPress={onDeleteMenuPress}
        onEditMenuPress={onEditMenuPress}
        onItemPress={onItemPress}
      />
      <ExpenseDeleteAlert {...expenseDeleteController} />
    </Layout>
  );
};
