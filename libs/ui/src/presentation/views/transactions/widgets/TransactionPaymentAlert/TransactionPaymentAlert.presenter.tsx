import { TransactionPaymentAlertView } from './TransactionPaymentAlert.view';
import { useTransactionPayController } from '../../../../controllers';
import { z } from 'zod';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

export const TransactionPaymentAlert = () => {
  const { state, dispatch } = useTransactionPayController();

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

  return (
    <TransactionPaymentAlertView
      form={form}
      onSubmit={onSubmit}
      isButtonDisabled={isButtonDisabled}
      isOpen={isOpen}
      onCancel={onCancel}
      walletSelectOptions={walletSelectOptions}
    />
  );
};
