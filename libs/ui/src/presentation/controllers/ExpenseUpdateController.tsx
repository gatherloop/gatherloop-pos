import { useToastController } from '@tamagui/toast';
import { ExpenseForm, ExpenseUpdateUsecase } from '../../domain';
import { useController } from './controller';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { match, P } from 'ts-pattern';
import { ExpenseUpdateProps } from '../components/expenses';

export const useExpenseUpdateController = (usecase: ExpenseUpdateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Update Expense Success');
    else if (state.type === 'submitError') toast.show('Update Expense Error');
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
    .returnType<ExpenseUpdateProps['variant']>()
    .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
    .with(
      { type: P.union('loaded', 'submitting', 'submitSuccess', 'submitError') },
      () => ({
        type: 'loaded',
      })
    )
    .with({ type: 'error' }, () => ({ type: 'error' }))
    .exhaustive();

  return {
    state,
    dispatch,
    form,
    onSubmit,
    isSubmitDisabled,
    onRetryButtonPress,
    budgetSelectOptions,
    walletSelectOptions,
    variant,
  };
};
