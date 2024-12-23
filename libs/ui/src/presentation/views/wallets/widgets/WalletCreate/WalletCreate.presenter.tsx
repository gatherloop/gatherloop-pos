import { WalletForm } from '../../../../../domain';
import { WalletCreateView } from './WalletCreate.view';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { useWalletCreateController } from '../../../../controllers';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

export const WalletCreate = () => {
  const controller = useWalletCreateController();

  const toast = useToastController();
  useEffect(() => {
    if (controller.state.type === 'submitSuccess')
      toast.show('Create Wallet Success');
    else if (controller.state.type === 'submitError')
      toast.show('Create Wallet Error');
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

  return (
    <WalletCreateView
      isSubmitDisabled={isSubmitDisabled}
      form={form}
      onSubmit={onSubmit}
    />
  );
};
