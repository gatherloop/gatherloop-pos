import { ExpenseListView, ExpenseListViewProps } from './ExpenseList.view';
import { Expense } from '../../../../../domain';
import { useExpenseListController } from '../../../../controllers';
import { match, P } from 'ts-pattern';

export type ExpenseListProps = {
  onDeleteMenuPress: (expense: Expense) => void;
  onEditMenuPress: (expense: Expense) => void;
  onItemPress: (expense: Expense) => void;
};

export const ExpenseList = ({
  onDeleteMenuPress,
  onEditMenuPress,
  onItemPress
}: ExpenseListProps) => {
  const { state, dispatch } = useExpenseListController();

  const onRetryButtonPress = () => dispatch({ type: 'FETCH' });

  const variant = match(state)
    .returnType<ExpenseListViewProps['variant']>()
    .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
    .with({ type: P.union('loaded', 'revalidating') }, ({ expenses }) => ({
      type: 'loaded',
      items: expenses.map((expense) => ({
        budgetName: expense.budget.name,
        createdAt: expense.createdAt,
        total: expense.total,
        walletName: expense.wallet.name,
        onDeleteMenuPress: () => onDeleteMenuPress(expense),
        onEditMenuPress: () => onEditMenuPress(expense),
        onPress: () => onItemPress(expense),
      })),
    }))
    .with({ type: 'error' }, () => ({ type: 'error' }))
    .exhaustive();

  return (
    <ExpenseListView
      variant={variant}
      onRetryButtonPress={onRetryButtonPress}
    />
  );
};
