import { Material, ProductForm } from '../../../../../domain';
import {
  ProductCreateView,
  ProductCreateViewProps,
} from './ProductCreate.view';
import { useEffect, useState } from 'react';
import { useToastController } from '@tamagui/toast';
import { match, P } from 'ts-pattern';
import { useProductCreateController } from '../../../../controllers';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

export const ProductCreate = () => {
  const controller = useProductCreateController();
  const [isMaterialSheetOpen, setIsMaterialSheetOpen] = useState(false);

  const toast = useToastController();
  useEffect(() => {
    if (controller.state.type === 'submitSuccess')
      toast.show('Create Product Success');
    else if (controller.state.type === 'submitError')
      toast.show('Create Product Error');
  }, [toast, controller.state.type]);

  const form = useForm({
    defaultValues: controller.state.values,
    resolver: zodResolver(
      z.object({
        categoryId: z.number(),
        name: z.string(),
        price: z.number(),
        materials: z.array(
          z.lazy(() => z.object({ materialId: z.number(), amount: z.number() }))
        ),
      })
    ),
  });

  const onSubmit = (values: ProductForm) => {
    controller.dispatch({ type: 'SUBMIT', values });
  };

  const { fields, append, update, remove } = useFieldArray({
    control: form.control,
    name: 'materials',
  });

  const onAddMaterial = (newMaterial: Material) => {
    const itemIndex = fields.findIndex(
      ({ material }) => material.id === newMaterial.id
    );
    const isItemExist = itemIndex !== -1;

    if (isItemExist) {
      update(itemIndex, {
        ...fields[itemIndex],
        amount: fields[itemIndex].amount + 1,
      });
    } else {
      append({ materialId: newMaterial.id, amount: 1, material: newMaterial });
    }

    setIsMaterialSheetOpen(false);
  };

  const onRemoveMaterial = (newMaterial: Material) => {
    const itemIndex = fields.findIndex(
      ({ material }) => material.id === newMaterial.id
    );
    const isItemExist = itemIndex !== -1;
    if (isItemExist) remove(itemIndex);
  };

  const isSubmitDisabled =
    controller.state.type === 'submitting' ||
    controller.state.type === 'submitSuccess';

  const onRetryButtonPress = () => controller.dispatch({ type: 'FETCH' });

  return (
    <ProductCreateView
      categorySelectOptions={controller.state.categories.map((category) => ({
        label: category.name,
        value: category.id,
      }))}
      isSubmitDisabled={isSubmitDisabled}
      form={form}
      onSubmit={onSubmit}
      isMaterialSheetOpen={isMaterialSheetOpen}
      onMaterialSheetOpenChange={setIsMaterialSheetOpen}
      onAddMaterial={onAddMaterial}
      onRemoveMaterial={onRemoveMaterial}
      onRetryButtonPress={onRetryButtonPress}
      variant={match(controller.state)
        .returnType<ProductCreateViewProps['variant']>()
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
