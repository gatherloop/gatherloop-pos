// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  CategoryRequest,
  categoryRequestSchema,
  useCategoryCreate,
} from '../../../../../api-contract/src';
import { useFormik } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import { useRouter } from 'solito/router'

export const useCategoryFormState = () => {
  const router = useRouter()

  const { mutateAsync } = useCategoryCreate();

  const formik = useFormik<CategoryRequest>({
    initialValues: {
      name: '',
      description: '',
      imageUrl: '',
    },
    onSubmit: (values) => mutateAsync(values).then(() => router.push('/categories')),
    validationSchema: toFormikValidationSchema(categoryRequestSchema),
  });

  return { formik };
};
