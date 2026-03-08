import { useEffect } from 'react';
import { ProductUpdateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

export const useProductUpdateController = (usecase: ProductUpdateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Update Product Success');
    else if (state.type === 'submitError') toast.show('Update Product Error');
  }, [toast, state.type]);

  const form = useForm({
    defaultValues: state.values,
    resolver: zodResolver(
      z.object({
        categoryId: z.number(),
        name: z.string().min(1),
        saleType: z.string().min(1),
        imageUrl: z.string().min(1).url(),
        description: z.string(),
      }),
      {},
      { raw: true }
    ),
  });


  return {
    state,
    dispatch,
    form,
  };
};
