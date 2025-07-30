import { ReactNode, useEffect } from 'react';
import { ProductCreateUsecase, ProductForm } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { match, P } from 'ts-pattern';
import { ProductFormViewProps } from '../components';

export type ProductCreateProviderProps = {
  children: ReactNode;
  usecase: ProductCreateUsecase;
};

export const useProductCreateController = (usecase: ProductCreateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Create Product Success');
    else if (state.type === 'submitError') toast.show('Create Product Error');
  }, [toast, state.type]);

  const form = useForm({
    defaultValues: state.values,
    resolver: zodResolver(
      z.object({
        categoryId: z.number(),
        name: z.string().min(1),
        description: z.string(),
        options: z.array(z.object({})).min(1),
      }),
      {},
      { raw: true }
    ),
  });

  const onSubmit = (values: ProductForm) => {
    dispatch({ type: 'SUBMIT', values });
  };

  const isSubmitDisabled =
    state.type === 'submitting' || state.type === 'submitSuccess';

  const onRetryButtonPress = () => dispatch({ type: 'FETCH' });

  const variant = match(state)
    .returnType<ProductFormViewProps['variant']>()
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
    .with({ type: 'error' }, () => ({ type: 'error' }))
    .exhaustive();

  const categorySelectOptions = state.categories.map((category) => ({
    label: category.name,
    value: category.id,
  }));

  return {
    state,
    dispatch,
    form,
    onSubmit,
    isSubmitDisabled,
    onRetryButtonPress,
    variant,
    categorySelectOptions,
  };
};
