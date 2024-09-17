// eslint-disable-next-line @nx/enforce-module-boundaries
import { useExpenseDeleteById } from '../../../../../api-contract/src';
import { useCallback, useState } from 'react';
import { useToastController } from '@tamagui/toast';
import { PostMessageEvent, usePostMessage } from '../../../base';

export const useExpenseDeleteAlertState = () => {
  const [expenseId, setExpenseId] = useState<number>();
  const { status, mutateAsync } = useExpenseDeleteById(expenseId ?? NaN);

  const onReceiveMessage = useCallback((event: PostMessageEvent) => {
    if (event.type === 'ExpenseDeleteConfirmation') {
      setExpenseId(event.expenseId);
    }
  }, []);

  const { postMessage } = usePostMessage(onReceiveMessage);

  const toast = useToastController();

  const onButtonConfirmPress = () => {
    mutateAsync({})
      .then(() => {
        toast.show('Expense deleted successfully');
        postMessage({ type: 'ExpenseDeleteSuccess' });
        setExpenseId(undefined);
      })
      .catch(() => toast.show('Failed to delete expense'));
  };

  const isOpen = typeof expenseId === 'number';

  const onCancel = () => setExpenseId(undefined);

  return { status, onButtonConfirmPress, isOpen, onCancel };
};
