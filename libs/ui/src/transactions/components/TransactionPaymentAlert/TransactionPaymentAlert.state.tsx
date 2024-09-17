import { useFormik } from 'formik';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  TransactionPayRequest,
  transactionPayRequestSchema,
  useTransactionPayById,
  useWalletList,
} from '../../../../../api-contract/src';
import { useToastController } from '@tamagui/toast';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import { PostMessageEvent, usePostMessage } from '../../../base';
import { useCallback, useState } from 'react';

export const useTransactionPaymentAlertState = () => {
  const wallets = useWalletList();

  const [transactionId, setTransactionId] = useState<number>();

  console.log(transactionId);

  const { status, mutateAsync } = useTransactionPayById(transactionId ?? NaN);

  const toast = useToastController();

  const onReceiveMessage = useCallback((event: PostMessageEvent) => {
    if (event.type === 'TransactionPayConfirmation') {
      setTransactionId(event.transactionId);
    }
  }, []);

  const { postMessage } = usePostMessage(onReceiveMessage);

  const formik = useFormik<TransactionPayRequest>({
    initialValues: {
      walletId: NaN,
    },
    onSubmit: (values) =>
      mutateAsync(values)
        .then(() => {
          toast.show('Transaction payment success');
          postMessage({ type: 'TransactionPaySuccess' });
          setTransactionId(undefined);
        })
        .catch(() => toast.show('Failed to pay transaction')),
    validationSchema: toFormikValidationSchema(transactionPayRequestSchema),
  });

  const isSubmitDisabled = status === 'pending' || status === 'success';

  const isOpen = typeof transactionId === 'number';

  const onCancel = () => setTransactionId(undefined);

  return {
    formik,
    wallets: wallets.data?.data ?? [],
    isSubmitDisabled,
    isOpen,
    onCancel,
  };
};
