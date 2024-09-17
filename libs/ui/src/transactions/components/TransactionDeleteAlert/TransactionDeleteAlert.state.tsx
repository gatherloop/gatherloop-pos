import { PostMessageEvent, usePostMessage } from '../../../base';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { useTransactionDeleteById } from '../../../../../api-contract/src';
import { useToastController } from '@tamagui/toast';
import { useCallback, useState } from 'react';

export const useTransactionDeleteAlertState = () => {
  const [transactionId, setTransactionId] = useState<number>();

  const { status, mutateAsync } = useTransactionDeleteById(
    transactionId ?? NaN
  );

  const toast = useToastController();

  const onReceiveMessage = useCallback((event: PostMessageEvent) => {
    if (event.type === 'TransactionDeleteConfirmation') {
      setTransactionId(event.transactionId);
    }
  }, []);

  const { postMessage } = usePostMessage(onReceiveMessage);

  const onButtonConfirmPress = () => {
    mutateAsync({})
      .then(() => {
        toast.show('Transaction deleted successfully');
        postMessage({ type: 'TransactionDeleteSuccess' });
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
