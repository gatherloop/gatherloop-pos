import { useFormik } from 'formik';
import { MaterialForm } from '../../../../../domain';
import {
  MaterialUpdateView,
  MaterialUpdateViewProps,
} from './MaterialUpdate.view';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { match, P } from 'ts-pattern';
import { useMaterialUpdateController } from '../../../../controllers';
import { z } from 'zod';
import { toFormikValidationSchema } from 'zod-formik-adapter';

export const MaterialUpdate = () => {
  const controller = useMaterialUpdateController();

  const toast = useToastController();
  useEffect(() => {
    if (controller.state.type === 'submitSuccess')
      toast.show('Update Material Success');
    else if (controller.state.type === 'submitError')
      toast.show('Update Material Error');
  }, [toast, controller.state.type]);

  const formik = useFormik<MaterialForm>({
    enableReinitialize: true,
    initialValues: controller.state.values,
    validationSchema: toFormikValidationSchema(
      z.object({
        name: z.string(),
        price: z.number(),
        unit: z.string(),
      })
    ),
    onSubmit: (values) => controller.dispatch({ type: 'SUBMIT', values }),
  });

  const isSubmitDisabled =
    controller.state.type === 'submitting' ||
    controller.state.type === 'submitSuccess';

  const onRetryButtonPress = () => controller.dispatch({ type: 'FETCH' });

  return (
    <MaterialUpdateView
      isSubmitDisabled={isSubmitDisabled}
      formik={formik}
      onRetryButtonPress={onRetryButtonPress}
      variant={match(controller.state)
        .returnType<MaterialUpdateViewProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({
          type: 'loading',
        }))
        .with(
          {
            type: P.union(
              'loaded',
              'submitSuccess',
              'submitError',
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
