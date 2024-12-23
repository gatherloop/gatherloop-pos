import { useToastController } from '@tamagui/toast';
import { WalletTransferCreateView } from './WalletTransferCreate.view';
import { useWalletTransferCreateController } from '../../../../controllers';
import { WalletTransferForm } from '../../../../../domain';
import { useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

export const WalletTransferCreate = () => {
  const { state, dispatch } = useWalletTransferCreateController();

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

  return (
    <WalletTransferCreateView
      isSubmitDisabled={isSubmitDisabled}
      form={form}
      onSubmit={onSubmit}
      walletSelectOptions={walletSelectOptions}
    />
  );
};
