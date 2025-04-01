import { useToastController } from '@tamagui/toast';
import { CalculationForm, CalculationUpdateUsecase } from '../../domain';
import { useController } from './controller';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { match, P } from 'ts-pattern';
import { CalculationFormViewProps } from '../components';

export const useCalculationUpdateController = (
  usecase: CalculationUpdateUsecase
) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess')
      toast.show('Update Calculation Success');
    else if (state.type === 'submitError')
      toast.show('Update Calculation Error');
  }, [toast, state.type]);

  const form = useForm({
    defaultValues: state.values,
    resolver: zodResolver(
      z.object({
        walletId: z.number(),
        calculationItems: z
          .array(
            z.lazy(() =>
              z.object({
                price: z.number().min(1),
                amount: z.number().min(0),
              })
            )
          )
          .min(1),
      }),
      {},
      { raw: true }
    ),
  });

  const onSubmit = (values: CalculationForm) =>
    dispatch({ type: 'SUBMIT', values });

  const isSubmitDisabled =
    state.type === 'submitting' || state.type === 'submitSuccess';

  const onRetryButtonPress = () => dispatch({ type: 'FETCH' });

  const walletSelectOptions = state.wallets.map((wallet) => ({
    label: wallet.name,
    value: wallet.id,
  }));

  const variant = match(state)
    .returnType<CalculationFormViewProps['variant']>()
    .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
    .with(
      { type: P.union('loaded', 'submitting', 'submitSuccess', 'submitError') },
      () => ({
        type: 'loaded',
      })
    )
    .with({ type: 'error' }, () => ({ type: 'error' }))
    .exhaustive();

  const getTotalWallet = (totalWallet: number, walletId: number): number => {
    return isNaN(totalWallet)
      ? state.wallets.find((wallet) => wallet.id === walletId)?.balance ?? 0
      : totalWallet;
  };

  return {
    state,
    dispatch,
    form,
    onSubmit,
    isSubmitDisabled,
    onRetryButtonPress,
    walletSelectOptions,
    variant,
    getTotalWallet,
  };
};
