import { useFormik } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import { TransactionPaymentAlertView } from './TransactionPaymentAlert.view';
import { useTransactionPayController } from '../../../../controllers';
import { z } from 'zod';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';

export const TransactionPaymentAlert = () => {
  const { state, dispatch } = useTransactionPayController();

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'payingSuccess') {
      toast.show('Payment Success');
    } else if (state.type === 'payingError') {
      toast.show('Payment Error');
    }
  }, [state.type, toast]);

  const formik = useFormik<{ walletId: number }>({
    initialValues: { walletId: NaN },
    onSubmit: ({ walletId }) => dispatch({ type: 'PAY', walletId }),
    validationSchema: toFormikValidationSchema(
      z.object({ walletId: z.number() })
    ),
  });

  const isButtonDisabled =
    state.type === 'paying' ||
    state.type === 'payingSuccess' ||
    state.type === 'payingError';

  const isOpen =
    state.type === 'shown' ||
    state.type === 'paying' ||
    state.type === 'payingSuccess' ||
    state.type === 'payingError';

  const onCancel = () => dispatch({ type: 'HIDE_CONFIRMATION' });

  const walletSelectOptions = state.wallets.map((wallet) => ({
    label: wallet.name,
    value: wallet.id,
  }));

  return (
    <TransactionPaymentAlertView
      formik={formik}
      isButtonDisabled={isButtonDisabled}
      isOpen={isOpen}
      onCancel={onCancel}
      walletSelectOptions={walletSelectOptions}
    />
  );
};
