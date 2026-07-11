import { useEffect } from 'react';
import { BudgetUpdateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { match, P } from 'ts-pattern';
import { BudgetFormViewProps } from '../components';

export const useBudgetUpdateController = (usecase: BudgetUpdateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Update Budget Success');
    else if (state.type === 'submitError') toast.show('Update Budget Error');
  }, [toast, state.type]);

  const form = useForm({
    defaultValues: state.values,
    resolver: zodResolver(
      z.object({
        name: z.string().min(1),
        percentage: z.number().min(0).max(100),
      })
    ),
  });

  const variant = match(state)
    .returnType<BudgetFormViewProps['variant']>()
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
    variant,
  };
};
