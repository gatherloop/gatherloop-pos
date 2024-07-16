// eslint-disable-next-line @nx/enforce-module-boundaries
import { Expense } from '../../../../../api-contract/src';
import { createParam } from 'solito';
import { useRouter } from 'solito/router';

export type ExpenseListScreenParams = {
  expenseDeleteId?: number;
};

const { useParam } = createParam<ExpenseListScreenParams>();

export const useExpenseListScreenState = () => {
  const [expenseDeleteId, setExpenseDeleteId] = useParam('expenseDeleteId', {
    initial: undefined,
    parse: (value) =>
      Array.isArray(value)
        ? parseInt(value[0])
        : typeof value === 'string'
        ? parseInt(value)
        : undefined,
  });
  const router = useRouter();

  const onItemPress = (expense: Expense) => {
    router.push(`/expenses/${expense.id}`);
  };

  const onEditMenuPress = (expense: Expense) => {
    router.push(`/expenses/${expense.id}`);
  };

  const onDeleteMenuPress = (expense: Expense) => {
    setExpenseDeleteId(expense.id);
  };

  const onDeleteSuccess = () => {
    router.replace('/expenses');
  };

  const onDeleteCancel = () => {
    setExpenseDeleteId(undefined);
  };

  return {
    expenseDeleteId,
    onItemPress,
    onEditMenuPress,
    onDeleteMenuPress,
    onDeleteSuccess,
    onDeleteCancel,
  };
};
