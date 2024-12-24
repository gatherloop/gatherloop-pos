import { ReactNode, useEffect, useState } from 'react';
import { Material, ProductCreateUsecase, ProductForm } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { match, P } from 'ts-pattern';
import { ProductCreateProps } from '../components';

export type ProductCreateProviderProps = {
  children: ReactNode;
  usecase: ProductCreateUsecase;
};

export const useProductCreateController = (usecase: ProductCreateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const [isMaterialSheetOpen, setIsMaterialSheetOpen] = useState(false);

  const onMaterialSheetOpenChange = setIsMaterialSheetOpen;

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Create Product Success');
    else if (state.type === 'submitError') toast.show('Create Product Error');
  }, [toast, state.type]);

  const form = useForm({
    defaultValues: state.values,
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
    dispatch({ type: 'SUBMIT', values });
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
    state.type === 'submitting' || state.type === 'submitSuccess';

  const onRetryButtonPress = () => dispatch({ type: 'FETCH' });

  const variant = match(state)
    .returnType<ProductCreateProps['variant']>()
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

  const categorySelectOptions = state.categories.map((category) => ({
    label: category.name,
    value: category.id,
  }));

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
    categorySelectOptions,
  };
};
