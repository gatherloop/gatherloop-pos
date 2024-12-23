import { MaterialForm } from '../../../../../domain';
import { MaterialCreateView } from './MaterialCreate.view';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { useMaterialCreateController } from '../../../../controllers';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

export const MaterialCreate = () => {
  const controller = useMaterialCreateController();

  const toast = useToastController();
  useEffect(() => {
    if (controller.state.type === 'submitSuccess')
      toast.show('Create Material Success');
    else if (controller.state.type === 'submitError')
      toast.show('Create Material Error');
  }, [toast, controller.state.type]);

  const form = useForm({
    defaultValues: controller.state.values,
    resolver: zodResolver(
      z.object({
        name: z.string().min(1),
        price: z.number().min(1),
        unit: z.string().min(1),
      })
    ),
  });

  const onSubmit = (values: MaterialForm) => {
    controller.dispatch({ type: 'SUBMIT', values });
  };

  const isSubmitDisabled =
    controller.state.type === 'submitting' ||
    controller.state.type === 'submitError' ||
    controller.state.type === 'submitSuccess';

  return (
    <MaterialCreateView
      isSubmitDisabled={isSubmitDisabled}
      form={form}
      onSubmit={onSubmit}
    />
  );
};
