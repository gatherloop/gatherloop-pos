import { useEffect } from 'react';
import { ChecklistSessionCreateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

export const checklistSessionFormSchema = z.object({
  checklistTemplateId: z.number().min(1, 'Template is required'),
  date: z.string().min(1, 'Date is required'),
});

export const useChecklistSessionCreateController = (
  usecase: ChecklistSessionCreateUsecase
) => {
  const { state, dispatch } = useController(usecase);
  const toast = useToastController();

  useEffect(() => {
    if (state.type === 'submitSuccess')
      toast.show('Checklist session created');
    else if (state.type === 'submitError')
      toast.show('Failed to create checklist session');
  }, [toast, state.type]);

  const form = useForm({
    defaultValues: state.values,
    resolver: zodResolver(checklistSessionFormSchema),
  });

  return {
    state,
    dispatch,
    form,
  };
};
