import { Event, Listener, useEventEmitter } from '../../../base';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { useTransactionDeleteById } from '../../../../../api-contract/src';
import { useToastController } from '@tamagui/toast';
import { useMemo, useState } from 'react';

export const useTransactionDeleteAlertState = () => {
  const [transactionId, setTransactionId] = useState<number>();

  const { status, mutateAsync } = useTransactionDeleteById(
    transactionId ?? NaN
  );

  const toast = useToastController();

  const listeners = useMemo<Listener<Event['type']>[]>(
    () => [
      {
        type: 'TransactionDeleteConfirmation',
        callback: (event) => setTransactionId(event.transactionId),
      },
    ],
    []
  );

  const { emit } = useEventEmitter(listeners);

  const onButtonConfirmPress = () => {
    mutateAsync({})
      .then(() => {
        toast.show('Transaction deleted successfully');
        emit({ type: 'TransactionDeleteSuccess' });
        setTransactionId(undefined);
      })
      .catch(() => toast.show('Failed to delete transaction'));
  };

  const isOpen = typeof transactionId === 'number';

  const onCancel = () => setTransactionId(undefined);

  return {
    status,
    onButtonConfirmPress,
    isOpen,
    onCancel,
  };
};
