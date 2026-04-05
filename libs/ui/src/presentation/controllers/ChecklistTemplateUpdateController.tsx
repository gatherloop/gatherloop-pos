import { useEffect } from 'react';
import { ChecklistTemplateUpdateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { checklistTemplateFormSchema } from './ChecklistTemplateCreateController';

export const useChecklistTemplateUpdateController = (
  usecase: ChecklistTemplateUpdateUsecase
) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess')
      toast.show('Update Checklist Template Success');
    else if (state.type === 'submitError')
      toast.show('Update Checklist Template Error');
  }, [toast, state.type]);

  const form = useForm({
    defaultValues: state.values,
    resolver: zodResolver(checklistTemplateFormSchema),
  });

  useEffect(() => {
    if (state.type === 'loaded') {
      form.reset(state.values);
    }
  }, [state.type, state.values, form]);

  return {
    state,
    dispatch,
    form,
  };
};
