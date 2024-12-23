import { CategoryForm } from '../../../../../domain';
import { CategoryCreateView } from './CategoryCreate.view';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { useCategoryCreateController } from '../../../../controllers';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

export const CategoryCreate = () => {
  const controller = useCategoryCreateController();

  const toast = useToastController();

  useEffect(() => {
    if (controller.state.type === 'submitSuccess')
      toast.show('Create Category Success');
    else if (controller.state.type === 'submitError')
      toast.show('Create Category Error');
  }, [toast, controller.state.type]);

  const form = useForm({
    defaultValues: controller.state.values,
    resolver: zodResolver(z.object({ name: z.string().min(1) })),
  });

  const onSubmit = (values: CategoryForm) => {
    controller.dispatch({ type: 'SUBMIT', values });
  };

  const isSubmitDisabled =
    controller.state.type === 'submitting' ||
    controller.state.type === 'submitError' ||
    controller.state.type === 'submitSuccess';

  return (
    <CategoryCreateView
      isSubmitDisabled={isSubmitDisabled}
      form={form}
      onSubmit={onSubmit}
    />
  );
};
