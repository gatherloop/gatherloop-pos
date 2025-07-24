import { useToastController } from '@tamagui/toast';
import { TransactionPayUsecase } from '../../domain';
import { useController } from './controller';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Wallet } from '@gatherloop-pos/api-contract';

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

  const form = useForm<{ wallet: Wallet; paidAmount: number }>({
    defaultValues: { paidAmount: 0 },
    resolver: zodResolver(
      z.object({
        wallet: z.object({ id: z.number() }),
        paidAmount: z.number().min(state.transactionTotal),
      })
    ),
  });

  const isCashless = useWatch({
    control: form.control,
    name: 'wallet.isCashless',
  });
  const paidAmount = useWatch({
    control: form.control,
    name: 'paidAmount',
  });

  useEffect(() => {
    if (isCashless && paidAmount !== state.transactionTotal) {
      form.setValue('paidAmount', state.transactionTotal);
    }
  }, [form, isCashless, paidAmount, state.transactionTotal]);

  const onSubmit = (values: { wallet: Wallet; paidAmount: number }) =>
    dispatch({
      type: 'PAY',
      walletId: values.wallet.id,
      paidAmount: values.paidAmount,
    });

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
    value: wallet,
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
    transactionTotal: state.transactionTotal,
  };
};
