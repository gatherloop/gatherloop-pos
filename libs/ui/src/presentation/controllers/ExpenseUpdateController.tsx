import { useToastController } from '@tamagui/toast';
import { ExpenseUpdateUsecase } from '../../domain';
import { useController } from './controller';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

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
      }),
      {},
      { raw: true }
    ),
  });

  const hasFilledFormRef = useRef(false);
  useEffect(() => {
    if (state.type === 'loaded' && !hasFilledFormRef.current) {
      form.reset(state.values);
      hasFilledFormRef.current = true;
    }
  }, [state.type, state.values, form]);

  return {
    state,
    dispatch,
    form,
  };
};
