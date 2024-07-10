import { useToastController } from '@tamagui/toast';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  ProductMaterialRequest,
  productMaterialRequestSchema,
  useMaterialList,
  useProductMaterialCreate,
  useProductMaterialFindById,
  useProductMaterialUpdateById,
} from '../../../../../api-contract/src';
import { useFormik } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';

export type UseProductMaterialFormStateProps = {
  variant:
    | { type: 'create'; productId: number }
    | {
        type: 'update';
        productId: number;
        productMaterialId: number;
      };
  onSuccess: () => void;
};

export const useProductMaterialFormState = ({
  variant,
  onSuccess,
}: UseProductMaterialFormStateProps) => {
  const materials = useMaterialList();

  const productMaterialId =
    variant.type === 'update' ? variant.productMaterialId : -1;
  const productId = variant.productId;

  const productMaterial = useProductMaterialFindById(
    productId,
    productMaterialId,
    {
      query: { enabled: variant.type === 'update' },
    }
  );

  const createProductMaterialMutation = useProductMaterialCreate(productId);
  const updateProductMaterialMutation = useProductMaterialUpdateById(
    productId,
    productMaterialId
  );
  const mutation =
    variant.type === 'create'
      ? createProductMaterialMutation
      : updateProductMaterialMutation;

  const toast = useToastController();

  const formik = useFormik<ProductMaterialRequest>({
    initialValues: {
      amount: productMaterial.data?.data.amount ?? 0,
      materialId: productMaterial.data?.data.materialId ?? NaN,
    },
    enableReinitialize: true,
    onSubmit: (values) =>
      mutation
        .mutateAsync(values)
        .then(() => {
          const message =
            variant.type === 'create'
              ? 'Product material created successfuly'
              : 'Product material updated successfully';
          toast.show(message);
        })
        .then(onSuccess)
        .catch(() => {
          const message =
            variant.type === 'create'
              ? 'Failed to create product material'
              : 'Failed to update product material';
          toast.show(message);
        }),
    validationSchema: toFormikValidationSchema(productMaterialRequestSchema),
  });

  return { formik, materials: materials.data?.data ?? [] };
};
