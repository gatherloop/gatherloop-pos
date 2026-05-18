import { useEffect } from 'react';
import { StockCheckUpdateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const stockCheckItemSchema = z.object({
  materialId: z.number().int().positive(),
  materialName: z.string(),
  purchaseUnit: z.string(),
  currentStock: z
    .number({ invalid_type_error: 'Stock is required' })
    .int()
    .min(0),
});

const stockCheckSchema = z.object({
  items: z.array(stockCheckItemSchema),
});

export const useStockCheckUpdateController = (usecase: StockCheckUpdateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Update Stock Check Success');
    else if (state.type === 'submitError') toast.show('Update Stock Check Error');
  }, [toast, state.type]);

  const form = useForm({
    defaultValues: state.values,
    resolver: zodResolver(stockCheckSchema),
  });

  return {
    state,
    dispatch,
    form,
  };
};
