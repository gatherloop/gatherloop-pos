import { useFormik } from 'formik';
import { MaterialForm } from '../../../../../domain';
import { MaterialCreateView } from './MaterialCreate.view';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { useMaterialCreateController } from '../../../../controllers';
import { z } from 'zod';
import { toFormikValidationSchema } from 'zod-formik-adapter';

export const MaterialCreate = () => {
  const controller = useMaterialCreateController();

  const toast = useToastController();
  useEffect(() => {
    if (controller.state.type === 'submitSuccess')
      toast.show('Create Material Success');
    else if (controller.state.type === 'submitError')
      toast.show('Create Material Error');
  }, [toast, controller.state.type]);

  const formik = useFormik<MaterialForm>({
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
    controller.state.type === 'submitError' ||
    controller.state.type === 'submitSuccess';

  return (
    <MaterialCreateView isSubmitDisabled={isSubmitDisabled} formik={formik} />
  );
};
