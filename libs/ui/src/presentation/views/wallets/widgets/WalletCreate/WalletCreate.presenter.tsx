import { useFormik } from 'formik';
import { WalletForm } from '../../../../../domain';
import { WalletCreateView } from './WalletCreate.view';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { useWalletCreateController } from '../../../../controllers';
import { z } from 'zod';
import { toFormikValidationSchema } from 'zod-formik-adapter';

export const WalletCreate = () => {
  const controller = useWalletCreateController();

  const toast = useToastController();
  useEffect(() => {
    if (controller.state.type === 'submitSuccess')
      toast.show('Create Wallet Success');
    else if (controller.state.type === 'submitError')
      toast.show('Create Wallet Error');
  }, [toast, controller.state.type]);

  const formik = useFormik<WalletForm>({
    initialValues: controller.state.values,
    validationSchema: toFormikValidationSchema(
      z.object({
        name: z.string(),
        balance: z.number(),
        paymentCostPercentage: z.number(),
      })
    ),
    onSubmit: (values) => controller.dispatch({ type: 'SUBMIT', values }),
  });

  const isSubmitDisabled =
    controller.state.type === 'submitting' ||
    controller.state.type === 'submitSuccess';

  return (
    <WalletCreateView isSubmitDisabled={isSubmitDisabled} formik={formik} />
  );
};
