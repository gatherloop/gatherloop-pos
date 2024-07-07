// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  ProductRequest,
  productRequestSchema,
  useProductCreate,
  useProductFindById,
  useProductUpdateById,
} from '../../../../../api-contract/src';
import { useFormik } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';

export type UseProductFormStateProps = {
  variant: { type: 'create' } | { type: 'update'; productId: number };
  onSuccess: () => void;
};

export const useProductFormState = ({
  variant,
  onSuccess,
}: UseProductFormStateProps) => {
  const productId = variant.type === 'update' ? variant.productId : -1;

  const product = useProductFindById(productId, {
    query: { enabled: variant.type === 'update' },
  });

  const createProductMutation = useProductCreate();
  const updateProductMutation = useProductUpdateById(productId);
  const mutation =
    variant.type === 'create' ? createProductMutation : updateProductMutation;

  const formik = useFormik<ProductRequest>({
    initialValues: {
      name: product.data?.data.name ?? '',
      categoryId: product.data?.data.categoryId ?? -1,
      price: product.data?.data.price ?? 0,
    },
    enableReinitialize: true,
    onSubmit: (values) => mutation.mutateAsync(values).then(onSuccess),
    validationSchema: toFormikValidationSchema(productRequestSchema),
  });

  return { formik };
};
