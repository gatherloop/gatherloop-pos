import { useEffect, useState } from 'react';
import { Material, VariantForm, VariantUpdateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';
import { UseFieldArrayReturn, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { VariantFormViewProps } from '../components';
import { match, P } from 'ts-pattern';

export const useVariantUpdateController = (usecase: VariantUpdateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const [isMaterialSheetOpen, setIsMaterialSheetOpen] = useState(false);

  const onMaterialSheetOpenChange = setIsMaterialSheetOpen;

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Update Variant Success');
    else if (state.type === 'submitError') toast.show('Update Variant Error');
  }, [toast, state.type]);

  const form = useForm({
    defaultValues: state.values,
    resolver: zodResolver(
      z.object({
        productId: z.number(),
        name: z.string().min(1),
        price: z.number().min(1),
        description: z.string(),
        materials: z
          .array(
            z.lazy(() =>
              z.object({ materialId: z.number(), amount: z.number() })
            )
          )
          .min(1),
        values: z
          .array(z.lazy(() => z.object({ optionValueId: z.number() })))
          .min(1),
      }),
      {},
      { raw: true }
    ),
  });

  const onSubmit = (values: VariantForm) => {
    dispatch({ type: 'SUBMIT', values });
  };

  const onAddMaterial = (
    newMaterial: Material,
    fieldArray: UseFieldArrayReturn<VariantForm, 'materials', 'key'>
  ) => {
    const itemIndex = fieldArray.fields.findIndex(
      ({ material }) => material.id === newMaterial.id
    );
    const isItemExist = itemIndex !== -1;

    if (isItemExist) {
      fieldArray.update(itemIndex, {
        ...form.getValues('materials')[itemIndex],
        amount: form.getValues('materials')[itemIndex].amount + 1,
      });
    } else {
      fieldArray.append({
        materialId: newMaterial.id,
        amount: 1,
        material: newMaterial,
      });
    }

    setIsMaterialSheetOpen(false);
  };

  const onRemoveMaterial = (
    newMaterial: Material,
    fieldArray: UseFieldArrayReturn<VariantForm, 'materials', 'key'>
  ) => {
    const itemIndex = fieldArray.fields.findIndex(
      ({ material }) => material.id === newMaterial.id
    );
    const isItemExist = itemIndex !== -1;
    if (isItemExist) fieldArray.remove(itemIndex);
  };

  const isSubmitDisabled =
    state.type === 'submitting' || state.type === 'submitSuccess';

  const onRetryButtonPress = () => dispatch({ type: 'FETCH' });

  const variant = match(state)
    .returnType<VariantFormViewProps['variant']>()
    .with({ type: P.union('idle', 'loading') }, () => ({
      type: 'loading',
    }))
    .with(
      {
        type: P.union('loaded', 'submitSuccess', 'submitError', 'submitting'),
      },
      () => ({
        type: 'loaded',
      })
    )
    .with({ type: 'error' }, () => ({ type: 'error' }))
    .exhaustive();

  return {
    state,
    dispatch,
    isMaterialSheetOpen,
    onMaterialSheetOpenChange,
    form,
    onSubmit,
    onAddMaterial,
    onRemoveMaterial,
    isSubmitDisabled,
    onRetryButtonPress,
    variant,
    product: state.product,
  };
};
