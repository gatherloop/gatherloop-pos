import { useFormik } from 'formik';
import { Material, ProductForm } from '../../../../../domain';
import {
  ProductUpdateView,
  ProductUpdateViewProps,
} from './ProductUpdate.view';
import { useEffect, useState } from 'react';
import { useToastController } from '@tamagui/toast';
import { match, P } from 'ts-pattern';
import { useProductUpdateController } from '../../../../controllers';
import { z } from 'zod';
import { toFormikValidationSchema } from 'zod-formik-adapter';

export const ProductUpdate = () => {
  const controller = useProductUpdateController();
  const [isMaterialSheetOpen, setIsMaterialSheetOpen] = useState(false);

  const toast = useToastController();
  useEffect(() => {
    if (controller.state.type === 'submitSuccess')
      toast.show('Update Product Success');
    else if (controller.state.type === 'submitError')
      toast.show('Update Product Error');
  }, [toast, controller.state.type]);

  const formik = useFormik<ProductForm>({
    initialValues: controller.state.values,
    validationSchema: toFormikValidationSchema(
      z.object({
        categoryId: z.number(),
        name: z.string(),
        price: z.number(),
        materials: z.array(
          z.lazy(() => z.object({ materialId: z.number(), amount: z.number() }))
        ),
      })
    ),
    onSubmit: (values) => controller.dispatch({ type: 'SUBMIT', values }),
  });

  const onAddMaterial = (newMaterial: Material) => {
    const itemIndex = formik.values.materials.findIndex(
      ({ material }) => material.id === newMaterial.id
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
          { materialId: newMaterial.id, amount: 1, material: newMaterial },
        ];

    formik.setFieldValue('materials', newMaterials);
    setIsMaterialSheetOpen(false);
  };

  const totalFoodCost = formik.values.materials.reduce(
    (prev, curr) => prev + curr.material.price * curr.amount,
    0
  );

  const foodCostPercentage =
    formik.values.price > 0 ? (totalFoodCost / formik.values.price) * 100 : 0;

  const isSubmitDisabled =
    controller.state.type === 'submitting' ||
    controller.state.type === 'submitSuccess';

  const onRetryButtonPress = () => controller.dispatch({ type: 'FETCH' });

  return (
    <ProductUpdateView
      categorySelectOptions={controller.state.categories.map((category) => ({
        label: category.name,
        value: category.id.toString(),
      }))}
      totalFoodCost={totalFoodCost}
      foodCostPercentage={foodCostPercentage}
      isSubmitDisabled={isSubmitDisabled}
      formik={formik}
      isMaterialSheetOpen={isMaterialSheetOpen}
      onMaterialSheetOpenChange={setIsMaterialSheetOpen}
      onAddMaterial={onAddMaterial}
      onRetryButtonPress={onRetryButtonPress}
      variant={match(controller.state)
        .returnType<ProductUpdateViewProps['variant']>()
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
