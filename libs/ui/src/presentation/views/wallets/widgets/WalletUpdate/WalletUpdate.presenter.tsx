import { WalletForm } from '../../../../../domain';
import { WalletUpdateView, WalletUpdateViewProps } from './WalletUpdate.view';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { match, P } from 'ts-pattern';
import { useWalletUpdateController } from '../../../../controllers';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

export const WalletUpdate = () => {
  const controller = useWalletUpdateController();

  const toast = useToastController();
  useEffect(() => {
    if (controller.state.type === 'submitSuccess')
      toast.show('Update Wallet Success');
    else if (controller.state.type === 'submitError')
      toast.show('Update Wallet Error');
  }, [toast, controller.state.type]);

  const form = useForm({
    defaultValues: controller.state.values,
    resolver: zodResolver(
      z.object({
        name: z.string().min(1),
        balance: z.number(),
        paymentCostPercentage: z.number(),
      })
    ),
  });

  const onSubmit = (values: WalletForm) =>
    controller.dispatch({ type: 'SUBMIT', values });

  const isSubmitDisabled =
    controller.state.type === 'submitting' ||
    controller.state.type === 'submitSuccess';

  const onRetryButtonPress = () => controller.dispatch({ type: 'FETCH' });

  return (
    <WalletUpdateView
      isSubmitDisabled={isSubmitDisabled}
      form={form}
      onSubmit={onSubmit}
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
