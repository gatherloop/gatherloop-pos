import { useFormik } from 'formik';
import { CategoryForm } from '../../../../../domain';
import { CategoryCreateView } from './CategoryCreate.view';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { useCategoryCreateController } from '../../../../controllers';
import { z } from 'zod';
import { toFormikValidationSchema } from 'zod-formik-adapter';

export const CategoryCreate = () => {
  const controller = useCategoryCreateController();

  const toast = useToastController();

  useEffect(() => {
    if (controller.state.type === 'submitSuccess')
      toast.show('Create Category Success');
    else if (controller.state.type === 'submitError')
      toast.show('Create Category Error');
  }, [toast, controller.state.type]);

  const formik = useFormik<CategoryForm>({
    initialValues: controller.state.values,
    validationSchema: toFormikValidationSchema(z.object({ name: z.string() })),
    onSubmit: (values) => controller.dispatch({ type: 'SUBMIT', values }),
  });

  const isSubmitDisabled =
    controller.state.type === 'submitting' ||
    controller.state.type === 'submitError' ||
    controller.state.type === 'submitSuccess';

  return (
    <CategoryCreateView isSubmitDisabled={isSubmitDisabled} formik={formik} />
  );
};
