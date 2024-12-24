import { useEffect } from 'react';
import { WalletCreateUsecase, WalletForm } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

export const useWalletCreateController = (usecase: WalletCreateUsecase) => {
  const { state, dispatch } = useController(usecase);
  const toast = useToastController();

  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Create Wallet Success');
    else if (state.type === 'submitError') toast.show('Create Wallet Error');
  }, [toast, state.type]);

  const form = useForm({
    defaultValues: state.values,
    resolver: zodResolver(
      z.object({
        name: z.string().min(1),
        balance: z.number(),
        paymentCostPercentage: z.number(),
      })
    ),
  });

  const onSubmit = (values: WalletForm) => dispatch({ type: 'SUBMIT', values });

  const isSubmitDisabled =
    state.type === 'submitting' || state.type === 'submitSuccess';

  return {
    state,
    dispatch,
    form,
    onSubmit,
    isSubmitDisabled,
  };
};
