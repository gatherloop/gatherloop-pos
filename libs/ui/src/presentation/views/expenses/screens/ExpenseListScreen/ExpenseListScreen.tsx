import { Button } from 'tamagui';
import { Layout } from '../../../base';
import { ExpenseList, ExpenseDeleteAlert } from '../../widgets';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import {
  useExpenseDeleteController,
  useExpenseListController,
} from '../../../../controllers';
import { Expense } from '../../../../../domain';
import { useRouter } from 'solito/router';
import { useEffect } from 'react';

const Content = () => {
  const router = useRouter();

  const expenseListController = useExpenseListController();
  const expenseDeleteController = useExpenseDeleteController();

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
    <>
      <ExpenseList
        onDeleteMenuPress={onDeleteMenuPress}
        onEditMenuPress={onEditMenuPress}
        onItemPress={onItemPress}
      />
      <ExpenseDeleteAlert />
    </>
  );
};

export const ExpenseListScreen = () => {
  return (
    <Layout
      title="Expenses"
      rightActionItem={
        <Link href="/expenses/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <Content />
    </Layout>
  );
};
