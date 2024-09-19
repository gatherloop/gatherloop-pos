// eslint-disable-next-line @nx/enforce-module-boundaries
import { useExpenseDeleteById } from '../../../../../api-contract/src';
import { useMemo, useState } from 'react';
import { useToastController } from '@tamagui/toast';
import { Event, Listener, useEventEmitter } from '../../../base';

export const useExpenseDeleteAlertState = () => {
  const [expenseId, setExpenseId] = useState<number>();
  const { status, mutateAsync } = useExpenseDeleteById(expenseId ?? NaN);

  const listeners = useMemo<Listener<Event['type']>[]>(
    () => [
      {
        type: 'ExpenseDeleteConfirmation',
        callback: (event) => setExpenseId(event.expenseId),
      },
    ],
    []
  );

  const { emit } = useEventEmitter(listeners);

  const toast = useToastController();

  const onButtonConfirmPress = () => {
    mutateAsync({})
      .then(() => {
        toast.show('Expense deleted successfully');
        emit({ type: 'ExpenseDeleteSuccess' });
        setExpenseId(undefined);
      })
      .catch(() => toast.show('Failed to delete expense'));
  };

  const isOpen = typeof expenseId === 'number';

  const onCancel = () => setExpenseId(undefined);

  return { status, onButtonConfirmPress, isOpen, onCancel };
};
