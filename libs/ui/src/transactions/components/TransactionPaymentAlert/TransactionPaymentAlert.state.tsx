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

export type UseTransactionPaymentAlertStateProps = {
  transactionId: number;
  onSuccess: () => void;
};

export const useTransactionPaymentAlertState = ({
  transactionId,
  onSuccess,
}: UseTransactionPaymentAlertStateProps) => {
  const wallets = useWalletList();
  const { status, mutateAsync } = useTransactionPayById(transactionId);

  const toast = useToastController();

  const formik = useFormik<TransactionPayRequest>({
    initialValues: {
      walletId: NaN,
    },
    onSubmit: (values) =>
      mutateAsync(values)
        .then(() => toast.show('Transaction payment success'))
        .then(onSuccess)
        .catch(() => toast.show('Failed to pay transaction')),
    validationSchema: toFormikValidationSchema(transactionPayRequestSchema),
  });

  const isSubmitDisabled = status === 'pending' || status === 'success';

  return {
    formik,
    wallets: wallets.data?.data ?? [],
    isSubmitDisabled,
  };
};
