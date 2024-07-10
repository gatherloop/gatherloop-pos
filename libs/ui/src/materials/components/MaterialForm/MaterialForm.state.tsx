import { useToastController } from '@tamagui/toast';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  MaterialRequest,
  materialRequestSchema,
  useMaterialCreate,
  useMaterialFindById,
  useMaterialUpdateById,
} from '../../../../../api-contract/src';
import { useFormik } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';

export type UseMaterialFormStateProps = {
  variant: { type: 'create' } | { type: 'update'; materialId: number };
  onSuccess: () => void;
};

export const useMaterialFormState = ({
  variant,
  onSuccess,
}: UseMaterialFormStateProps) => {
  const materialId = variant.type === 'update' ? variant.materialId : -1;

  const material = useMaterialFindById(materialId, {
    query: { enabled: variant.type === 'update' },
  });

  const createMaterialMutation = useMaterialCreate();
  const updateMaterialMutation = useMaterialUpdateById(materialId);
  const mutation =
    variant.type === 'create' ? createMaterialMutation : updateMaterialMutation;

  const toast = useToastController();

  const formik = useFormik<MaterialRequest>({
    initialValues: {
      name: material.data?.data.name ?? '',
      price: material.data?.data.price ?? 0,
      unit: material.data?.data.unit ?? '',
    },
    enableReinitialize: true,
    onSubmit: (values) =>
      mutation
        .mutateAsync(values)
        .then(() => {
          const message =
            variant.type === 'create'
              ? 'Material created successfuly'
              : 'Material updated successfully';
          toast.show(message);
        })
        .then(onSuccess)
        .catch(() => {
          const message =
            variant.type === 'create'
              ? 'Failed to create material'
              : 'Failed to update material';
          toast.show(message);
        }),
    validationSchema: toFormikValidationSchema(materialRequestSchema),
  });

  return { formik };
};
