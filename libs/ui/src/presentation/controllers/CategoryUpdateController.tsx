import { useEffect } from 'react';
import { CategoryForm, CategoryUpdateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { match, P } from 'ts-pattern';
import { CategoryFormViewProps } from '../components';

export const useCategoryUpdateController = (usecase: CategoryUpdateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();

  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Update Category Success');
    else if (state.type === 'submitError') toast.show('Update Category Error');
  }, [toast, state.type]);

  const form = useForm({
    defaultValues: state.values,
    resolver: zodResolver(z.object({ name: z.string().min(1) })),
  });

  const onSubmit = (values: CategoryForm) => {
    dispatch({ type: 'SUBMIT', values });
  };

  const isSubmitDisabled =
    state.type === 'submitting' || state.type === 'submitSuccess';

  const variant = match(state)
    .returnType<CategoryFormViewProps['variant']>()
    .with({ type: P.union('idle', 'loading') }, () => ({
      type: 'loading',
    }))
    .with(
      {
        type: P.union('loaded', 'submitError', 'submitSuccess', 'submitting'),
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
    onSubmit,
    isSubmitDisabled,
    variant,
  };
};
