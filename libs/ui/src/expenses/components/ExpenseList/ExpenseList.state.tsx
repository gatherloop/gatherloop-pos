import { useRouter } from 'solito/router';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { Expense, useExpenseList } from '../../../../../api-contract/src';
import { Event, Listener, useEventEmitter } from '../../../base';
import { useMemo } from 'react';

export const useExpenseListState = () => {
  const router = useRouter();

  const { data, status, error, refetch } = useExpenseList({
    sortBy: 'created_at',
    order: 'desc',
  });

  const listeners = useMemo<Listener<Event['type']>[]>(
    () => [
      {
        type: 'ExpenseDeleteSuccess',
        callback: () => refetch(),
      },
    ],
    [refetch]
  );

  const { emit } = useEventEmitter(listeners);

  const onDeleteMenuPress = (expense: Expense) => {
    emit({
      type: 'ExpenseDeleteConfirmation',
      expenseId: expense.id,
    });
  };

  const onEditMenuPress = (expense: Expense) => {
    router.push(`/expenses/${expense.id}`);
  };

  return {
    expenses: data?.data ?? [],
    status,
    error,
    refetch,
    onDeleteMenuPress,
    onEditMenuPress,
  };
};
