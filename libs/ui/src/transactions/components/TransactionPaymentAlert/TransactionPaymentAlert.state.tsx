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
import { Event, Listener, useEventEmitter } from '../../../base';
import { useMemo, useState } from 'react';

export const useTransactionPaymentAlertState = () => {
  const wallets = useWalletList();

  const [transactionId, setTransactionId] = useState<number>();

  const { status, mutateAsync, reset } = useTransactionPayById(
    transactionId ?? NaN
  );

  const toast = useToastController();

  const listeners = useMemo<Listener<Event['type']>[]>(
    () => [
      {
        type: 'TransactionPayConfirmation',
        callback: (event) => setTransactionId(event.transactionId),
      },
    ],
    []
  );

  const { emit } = useEventEmitter(listeners);

  const formik = useFormik<TransactionPayRequest>({
    initialValues: {
      walletId: NaN,
    },
    onSubmit: (values) =>
      mutateAsync(values)
        .then(() => {
          toast.show('Transaction payment success');
          emit({ type: 'TransactionPaySuccess' });
          setTransactionId(undefined);
          formik.resetForm();
          reset();
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
