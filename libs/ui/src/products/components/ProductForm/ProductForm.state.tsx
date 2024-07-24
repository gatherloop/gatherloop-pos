import { useToastController } from '@tamagui/toast';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  Material,
  ProductMaterialRequest,
  ProductRequest,
  productRequestSchema,
  useCategoryList,
  useProductCreate,
  useProductFindById,
  useProductUpdateById,
} from '../../../../../api-contract/src';
import { useFormik } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import { useState } from 'react';

export type ProductFormValues = Omit<ProductRequest, 'materials'> & {
  materials: (ProductMaterialRequest & { material: Material })[];
};

export type UseProductFormStateProps = {
  variant: { type: 'create' } | { type: 'update'; productId: number };
  onSuccess: () => void;
};

export const useProductFormState = ({
  variant,
  onSuccess,
}: UseProductFormStateProps) => {
  const [isMaterialSheetOpen, setIsMaterialSheetOpen] = useState(false);

  const categories = useCategoryList();

  const productId = variant.type === 'update' ? variant.productId : -1;

  const product = useProductFindById(productId, {
    query: { enabled: variant.type === 'update' },
  });

  const createProductMutation = useProductCreate();
  const updateProductMutation = useProductUpdateById(productId);
  const mutation =
    variant.type === 'create' ? createProductMutation : updateProductMutation;

  const toast = useToastController();

  const formik = useFormik<ProductFormValues>({
    initialValues: {
      name: product.data?.data.name ?? '',
      categoryId: product.data?.data.categoryId ?? NaN,
      price: product.data?.data.price ?? 0,
      materials: product.data?.data.materials ?? [],
    },
    enableReinitialize: true,
    onSubmit: (values) =>
      mutation
        .mutateAsync({
          ...values,
          materials: values.materials.map((productMaterial) => ({
            ...productMaterial,
            material: undefined,
            id: undefined,
            productId: undefined,
          })),
        })
        .then(() => {
          const message =
            variant.type === 'create'
              ? 'Product created successfuly'
              : 'Product updated successfully';
          toast.show(message);
        })
        .then(onSuccess)
        .catch(() => {
          const message =
            variant.type === 'create'
              ? 'Failed to create product'
              : 'Failed to update product';
          toast.show(message);
        }),
    validationSchema: toFormikValidationSchema(productRequestSchema),
  });

  const onAddMaterial = (material: Material) => {
    const itemIndex = formik.values.materials?.findIndex(
      ({ materialId }) => materialId === material.id
    );
    const isItemExist = itemIndex !== -1;
    const newMaterials = isItemExist
      ? formik.values.materials.map((productMaterial, index) =>
          index === itemIndex
            ? {
                ...productMaterial,
                amount: productMaterial.amount + 1,
              }
            : productMaterial
        )
      : [
          ...formik.values.materials,
          { materialId: material.id, amount: 1, material },
        ];

    formik.setFieldValue('materials', newMaterials);
    setIsMaterialSheetOpen(false);
  };

  const totalFoodCost = formik.values.materials.reduce(
    (prev, curr) => prev + curr.amount * curr.material.price,
    0
  );

  const foodCostPercentage =
    formik.values.price > 0 ? (totalFoodCost / formik.values.price) * 100 : 0;

  return {
    formik,
    categories: categories.data?.data ?? [],
    isMaterialSheetOpen,
    setIsMaterialSheetOpen,
    onAddMaterial,
    totalFoodCost,
    foodCostPercentage,
  };
};
