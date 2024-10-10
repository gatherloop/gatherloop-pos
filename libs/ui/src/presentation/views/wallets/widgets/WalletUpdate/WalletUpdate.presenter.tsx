import { useFormik } from 'formik';
import { WalletForm } from '../../../../../domain';
import { WalletUpdateView, WalletUpdateViewProps } from './WalletUpdate.view';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { match, P } from 'ts-pattern';
import { useWalletUpdateController } from '../../../../controllers';
import { z } from 'zod';
import { toFormikValidationSchema } from 'zod-formik-adapter';

export const WalletUpdate = () => {
  const controller = useWalletUpdateController();

  const toast = useToastController();
  useEffect(() => {
    if (controller.state.type === 'submitSuccess')
      toast.show('Update Wallet Success');
    else if (controller.state.type === 'submitError')
      toast.show('Update Wallet Error');
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

  const onRetryButtonPress = () => controller.dispatch({ type: 'FETCH' });

  return (
    <WalletUpdateView
      isSubmitDisabled={isSubmitDisabled}
      formik={formik}
      onRetryButtonPress={onRetryButtonPress}
      variant={match(controller.state)
        .returnType<WalletUpdateViewProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({
          type: 'loading',
        }))
        .with(
          {
            type: P.union(
              'loaded',
              'submitSuccess',
              'submitting',
              'submitError'
            ),
          },
          () => ({
            type: 'loaded',
          })
        )
        .with({ type: 'error' }, () => ({ type: 'error' }))
        .exhaustive()}
    />
  );
};
