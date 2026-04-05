import { useEffect } from 'react';
import { ChecklistTemplateCreateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const checklistTemplateSubItemSchema = z.object({
  name: z.string().min(1, 'Sub-item name is required'),
  displayOrder: z.number(),
});

const checklistTemplateItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional(),
  displayOrder: z.number(),
  subItems: z.array(checklistTemplateSubItemSchema),
});

export const checklistTemplateFormSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  items: z
    .array(checklistTemplateItemSchema)
    .min(1, 'At least one item is required'),
});

export const useChecklistTemplateCreateController = (
  usecase: ChecklistTemplateCreateUsecase
) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess')
      toast.show('Create Checklist Template Success');
    else if (state.type === 'submitError')
      toast.show('Create Checklist Template Error');
  }, [toast, state.type]);

  const form = useForm({
    defaultValues: state.values,
    resolver: zodResolver(checklistTemplateFormSchema),
  });

  return {
    state,
    dispatch,
    form,
  };
};
