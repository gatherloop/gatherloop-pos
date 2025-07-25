import { useEffect } from 'react';
import { WalletForm, WalletUpdateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { match, P } from 'ts-pattern';
import { WalletFormViewProps } from '../components';

export const useWalletUpdateController = (usecase: WalletUpdateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Update Wallet Success');
    else if (state.type === 'submitError') toast.show('Update Wallet Error');
  }, [toast, state.type]);

  const form = useForm({
    defaultValues: state.values,
    resolver: zodResolver(
      z.object({
        name: z.string().min(1),
        balance: z.number(),
        paymentCostPercentage: z.number(),
        isCashless: z.boolean(),
      })
    ),
  });

  const onSubmit = (values: WalletForm) => dispatch({ type: 'SUBMIT', values });

  const isSubmitDisabled =
    state.type === 'submitting' || state.type === 'submitSuccess';

  const variant = match(state)
    .returnType<WalletFormViewProps['variant']>()
    .with({ type: P.union('idle', 'loading') }, () => ({
      type: 'loading',
    }))
    .with(
      {
        type: P.union('loaded', 'submitSuccess', 'submitting', 'submitError'),
      },
      () => ({
        type: 'loaded',
      })
    )
    .with({ type: 'error' }, () => ({
      type: 'error',
      onRetryButtonPress: () => dispatch({ type: 'FETCH' }),
    }))
    .exhaustive();

  return {
    state,
    dispatch,
    form,
    onSubmit,
    isSubmitDisabled,
    variant,
  };
};
