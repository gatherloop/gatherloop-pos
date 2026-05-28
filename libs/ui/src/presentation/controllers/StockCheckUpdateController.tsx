import { useEffect, useState } from 'react';
import { StockCheckUpdateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const stockCheckItemSchema = z.object({
  materialId: z.number().int().positive(),
  materialName: z.string(),
  purchaseUnit: z.string(),
  currentStock: z
    .number({ invalid_type_error: 'Please enter the current stock' })
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

  const [query, setQuery] = useState('');
  const [showOnlyPending, setShowOnlyPending] = useState(false);

  const watchedItems = useWatch({ control: form.control, name: 'items' });
  const total = watchedItems.length;
  const filled = watchedItems.filter((item) => item.currentStock !== null).length;
  const pendingRows = watchedItems.map((item) => item.currentStock === null);

  const toggleShowOnlyPending = () => setShowOnlyPending((prev) => !prev);

  return {
    state,
    dispatch,
    form,
    query,
    setQuery,
    showOnlyPending,
    toggleShowOnlyPending,
    filled,
    total,
    pendingRows,
  };
};
