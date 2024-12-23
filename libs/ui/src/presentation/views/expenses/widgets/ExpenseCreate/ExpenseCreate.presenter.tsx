import {
  ExpenseCreateView,
  ExpenseCreateViewProps,
} from './ExpenseCreate.view';
import { ExpenseForm } from '../../../../../domain';
import { useExpenseCreateController } from '../../../../controllers';
import { match, P } from 'ts-pattern';
import { z } from 'zod';
import { useToastController } from '@tamagui/toast';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

export const ExpenseCreate = () => {
  const { state, dispatch } = useExpenseCreateController();

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Create Expense Success');
    else if (state.type === 'submitError') toast.show('Create Expense Error');
  }, [toast, state.type]);

  const form = useForm({
    defaultValues: state.values,
    resolver: zodResolver(
      z.object({
        walletId: z.number(),
        budgetId: z.number(),
        expenseItems: z
          .array(
            z.lazy(() =>
              z.object({
                name: z.string().min(1),
                unit: z.string().min(1),
                price: z.number().min(1),
                amount: z.number().min(1),
              })
            )
          )
          .min(1),
      })
    ),
  });

  const onSubmit = (values: ExpenseForm) =>
    dispatch({ type: 'SUBMIT', values });

  const isSubmitDisabled =
    state.type === 'submitting' || state.type === 'submitSuccess';

  const onRetryButtonPress = () => dispatch({ type: 'FETCH' });

  const budgetSelectOptions = state.budgets.map((budget) => ({
    label: budget.name,
    value: budget.id,
  }));

  const walletSelectOptions = state.wallets.map((wallet) => ({
    label: wallet.name,
    value: wallet.id,
  }));

  const variant = match(state)
    .returnType<ExpenseCreateViewProps['variant']>()
    .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
    .with(
      { type: P.union('loaded', 'submitting', 'submitSuccess', 'submitError') },
      () => ({
        type: 'loaded',
      })
    )
    .with({ type: 'error' }, () => ({ type: 'error' }))
    .exhaustive();

  return (
    <ExpenseCreateView
      isSubmitDisabled={isSubmitDisabled}
      onRetryButtonPress={onRetryButtonPress}
      budgetSelectOptions={budgetSelectOptions}
      walletSelectOptions={walletSelectOptions}
      form={form}
      onSubmit={onSubmit}
      variant={variant}
    />
  );
};
