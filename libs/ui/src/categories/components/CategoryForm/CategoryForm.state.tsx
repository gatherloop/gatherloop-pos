// eslint-disable-next-line @nx/enforce-module-boundaries
import {
    CategoryRequest,
    categoryRequestSchema,
    useCategoryCreate,
    useCategoryFindById,
    useCategoryUpdateById,
  } from '../../../../../api-contract/src';
  import { useFormik } from 'formik';
  import { toFormikValidationSchema } from 'zod-formik-adapter';
  
  export type UseCategoryFormStateProps = {
    variant: { type: 'create' } | { type: 'update'; categoryId: number };
    onSuccess: () => void;
  };
  
  export const useCategoryFormState = ({
    variant,
    onSuccess,
  }: UseCategoryFormStateProps) => {
    const categoryId = variant.type === 'update' ? variant.categoryId : -1;
  
    const category = useCategoryFindById(categoryId, {
      query: { enabled: variant.type === 'update' },
    });
  
    const createCategoryMutation = useCategoryCreate();
    const updateCategoryMutation = useCategoryUpdateById(categoryId);
    const mutation =
      variant.type === 'create' ? createCategoryMutation : updateCategoryMutation;
  
    const formik = useFormik<CategoryRequest>({
      initialValues: {
        name: category.data?.data.name ?? '',
        description: category.data?.data.description ?? '',
        imageUrl: category.data?.data.imageUrl ?? '',
      },
      enableReinitialize: true,
      onSubmit: (values) => mutation.mutateAsync(values).then(onSuccess),
      validationSchema: toFormikValidationSchema(categoryRequestSchema),
    });
  
    return { formik };
  };
  