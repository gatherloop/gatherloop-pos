import { useFormik } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import { TransactionPaymentAlertView } from './TransactionPaymentAlert.view';
import { useTransactionPayController } from '../../../../controllers';
import { z } from 'zod';

export const TransactionPaymentAlert = () => {
  const { state, dispatch } = useTransactionPayController();

  const formik = useFormik<{ walletId: number }>({
    initialValues: { walletId: NaN },
    onSubmit: ({ walletId }) => dispatch({ type: 'PAY', walletId }),
    validationSchema: toFormikValidationSchema(
      z.object({ walletId: z.number() })
    ),
  });

  const isButtonDisabled =
    state.type === 'paying' || state.type === 'payingSuccess';

  const isOpen =
    state.type === 'shown' ||
    state.type === 'paying' ||
    state.type === 'payingSuccess';

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
