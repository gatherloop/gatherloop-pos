import { useRouter } from 'solito/router';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { Expense, useExpenseList } from '../../../../../api-contract/src';
import { PostMessageEvent, usePostMessage } from '../../../base';
import { useCallback } from 'react';

export const useExpenseListState = () => {
  const router = useRouter();

  const { data, status, error, refetch } = useExpenseList({
    sortBy: 'created_at',
    order: 'desc',
  });

  const onReceiveMessage = useCallback(
    (event: PostMessageEvent) => {
      if (event.type === 'ExpenseDeleteSuccess') {
        refetch();
      }
    },
    [refetch]
  );

  const { postMessage } = usePostMessage(onReceiveMessage);

  const onDeleteMenuPress = (expense: Expense) => {
    postMessage({
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
