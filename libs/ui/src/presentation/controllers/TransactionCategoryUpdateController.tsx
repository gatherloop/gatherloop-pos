import { useEffect } from 'react';
import {
  TransactionCategoryForm,
  TransactionCategoryUpdateUsecase,
} from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TransactionCategoryFormViewProps } from '../components';
import { match, P } from 'ts-pattern';

export const useTransactionCategoryUpdateController = (
  usecase: TransactionCategoryUpdateUsecase
) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess')
      toast.show('Update Transaction Category Success');
    else if (state.type === 'submitError')
      toast.show('Update Transaction Category Error');
  }, [toast, state.type]);

  const form = useForm({
    defaultValues: state.values,
    resolver: zodResolver(
      z.object({
        name: z.string().min(1),
        checkoutProductId: z.number().nullable(),
      }),
      {},
      { raw: true }
    ),
  });

  const onSubmit = (values: TransactionCategoryForm) => {
    dispatch({ type: 'SUBMIT', values });
  };

  const isSubmitDisabled =
    state.type === 'submitting' || state.type === 'submitSuccess';

  const onRetryButtonPress = () => dispatch({ type: 'FETCH' });

  const variant = match(state)
    .returnType<TransactionCategoryFormViewProps['variant']>()
    .with({ type: P.union('idle', 'loading') }, () => ({
      type: 'loading',
    }))
    .with(
      {
        type: P.union('loaded', 'submitSuccess', 'submitError', 'submitting'),
      },
      () => ({
        type: 'loaded',
      })
    )
    .with({ type: 'error' }, () => ({ type: 'error', onRetryButtonPress }))
    .exhaustive();

  const productSelectOptions = state.products.map((product) => ({
    label: product.name,
    value: product.id,
  }));

  return {
    state,
    dispatch,
    form,
    onSubmit,
    isSubmitDisabled,
    onRetryButtonPress,
    variant,
    productSelectOptions,
  };
};
