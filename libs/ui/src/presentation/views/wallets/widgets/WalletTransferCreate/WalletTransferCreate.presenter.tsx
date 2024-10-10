import { useToastController } from '@tamagui/toast';
import { WalletTransferCreateView } from './WalletTransferCreate.view';
import { useWalletTransferCreateController } from '../../../../controllers';
import { useFormik } from 'formik';
import { WalletTransferForm } from '../../../../../domain';
import { useEffect } from 'react';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import { z } from 'zod';

export const WalletTransferCreate = () => {
  const { state, dispatch } = useWalletTransferCreateController();

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Transfer Success');
    else if (state.type === 'submitError') toast.show('Transfer Error');
  }, [toast, state.type]);

  const formik = useFormik<WalletTransferForm>({
    initialValues: state.values,
    onSubmit: (values) => dispatch({ type: 'SUBMIT', values }),
    validationSchema: toFormikValidationSchema(
      z.object({
        amount: z.number(),
        fromWalletId: z.number(),
        toWalletId: z.number(),
      })
    ),
  });

  const isSubmitDisabled = state.type === 'submitting';

  const walletSelectOptions = state.wallets
    .filter((wallet) => wallet.id !== formik.values.fromWalletId)
    .map((wallet) => ({
      label: wallet.name,
      value: wallet.id.toString(),
    }));

  return (
    <WalletTransferCreateView
      isSubmitDisabled={isSubmitDisabled}
      formik={formik}
      walletSelectOptions={walletSelectOptions}
    />
  );
};
