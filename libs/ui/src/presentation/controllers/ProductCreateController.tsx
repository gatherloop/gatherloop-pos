import { ReactNode, useEffect } from 'react';
import { ProductCreateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

export type ProductCreateProviderProps = {
  children: ReactNode;
  usecase: ProductCreateUsecase;
};

export const useProductCreateController = (usecase: ProductCreateUsecase) => {
  const { state, dispatch } = useController(usecase);

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
        name: z.string().min(1),
        saleType: z.string().min(1),
        description: z.string(),
        imageUrl: z.string().min(1).url(),
        options: z.array(z.object({})).min(1),
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
