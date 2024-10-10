import { useFormik } from 'formik';
import { CategoryForm } from '../../../../../domain';
import {
  CategoryUpdateView,
  CategoryUpdateViewProps,
} from './CategoryUpdate.view';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { match, P } from 'ts-pattern';
import { useCategoryUpdateController } from '../../../../controllers';
import { z } from 'zod';
import { toFormikValidationSchema } from 'zod-formik-adapter';

export const CategoryUpdate = () => {
  const controller = useCategoryUpdateController();

  const toast = useToastController();

  useEffect(() => {
    if (controller.state.type === 'submitSuccess')
      toast.show('Update Category Success');
    else if (controller.state.type === 'submitError')
      toast.show('Update Category Error');
  }, [toast, controller.state.type]);

  const formik = useFormik<CategoryForm>({
    initialValues: controller.state.values,
    validationSchema: toFormikValidationSchema(z.object({ name: z.string() })),
    onSubmit: (values) => controller.dispatch({ type: 'SUBMIT', values }),
  });

  const isSubmitDisabled =
    controller.state.type === 'submitting' ||
    controller.state.type === 'submitSuccess';

  const onRetryButtonPress = () => controller.dispatch({ type: 'FETCH' });

  return (
    <CategoryUpdateView
      isSubmitDisabled={isSubmitDisabled}
      formik={formik}
      onRetryButtonPress={onRetryButtonPress}
      variant={match(controller.state)
        .returnType<CategoryUpdateViewProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({
          type: 'loading',
        }))
        .with(
          {
            type: P.union(
              'loaded',
              'submitError',
              'submitSuccess',
              'submitting'
            ),
          },
          () => ({
            type: 'loaded',
          })
        )
        .with({ type: 'error' }, () => ({ type: 'error' }))
        .exhaustive()}
    />
  );
};
