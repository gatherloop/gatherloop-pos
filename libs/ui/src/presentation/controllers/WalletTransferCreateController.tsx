import { useEffect } from 'react';
import { WalletTransferCreateUsecase, WalletTransferForm } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

export const useWalletTransferCreateController = (
  usecase: WalletTransferCreateUsecase
) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Transfer Success');
    else if (state.type === 'submitError') toast.show('Transfer Error');
  }, [toast, state.type]);

  const form = useForm({
    defaultValues: state.values,
    resolver: zodResolver(
      z.object({
        amount: z.number().min(1),
        fromWalletId: z.number(),
        toWalletId: z.number(),
      })
    ),
  });

  const onSubmit = (values: WalletTransferForm) =>
    dispatch({ type: 'SUBMIT', values });

  const isSubmitDisabled = state.type === 'submitting';

  const walletSelectOptions = state.wallets
    .filter((wallet) => wallet.id !== state.values.fromWalletId)
    .map((wallet) => ({
      label: wallet.name,
      value: wallet.id,
    }));

  return {
    state,
    dispatch,
    form,
    onSubmit,
    isSubmitDisabled,
    walletSelectOptions,
  };
};
