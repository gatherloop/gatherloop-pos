import { useToastController } from '@tamagui/toast';
import { TransactionPayUsecase } from '../../domain';
import { useController } from './controller';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

export const useTransactionPayController = (usecase: TransactionPayUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'payingSuccess') {
      toast.show('Payment Success');
    } else if (state.type === 'payingError') {
      toast.show('Payment Error');
    }
  }, [state.type, toast]);

  const form = useForm<{ walletId: number }>({
    defaultValues: { walletId: NaN },
    resolver: zodResolver(z.object({ walletId: z.number().min(1) })),
  });

  const onSubmit = (values: { walletId: number }) =>
    dispatch({ type: 'PAY', walletId: values.walletId });

  const isButtonDisabled =
    state.type === 'paying' ||
    state.type === 'payingSuccess' ||
    state.type === 'payingError';

  const isOpen =
    state.type === 'shown' ||
    state.type === 'paying' ||
    state.type === 'payingSuccess' ||
    state.type === 'payingError';

  const onCancel = () => dispatch({ type: 'HIDE_CONFIRMATION' });

  const walletSelectOptions = state.wallets.map((wallet) => ({
    label: wallet.name,
    value: wallet.id,
  }));

  return {
    state,
    dispatch,
    form,
    onSubmit,
    isButtonDisabled,
    isOpen,
    onCancel,
    walletSelectOptions,
  };
};
