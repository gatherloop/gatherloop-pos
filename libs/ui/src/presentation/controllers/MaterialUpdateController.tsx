import { useEffect } from 'react';
import { MaterialUpdateUsecase, Supplier } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { useSupplierList } from '../../../../api-contract/src';
import { toSupplier } from '../../data/api/supplier.transformer';

export const useMaterialUpdateController = (usecase: MaterialUpdateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Update Material Success');
    else if (state.type === 'submitError') toast.show('Update Material Error');
  }, [toast, state.type]);

  const form = useForm({
    defaultValues: state.values,
    resolver: zodResolver(
      z.object({
        name: z.string().min(1),
        price: z.number().min(1),
        unit: z.string().min(1),
        description: z.string(),
        purchaseUnit: z.string().min(1),
        purchaseUnitSize: z.number().positive(),
        minimumStock: z.number().int().min(0),
        normalStock: z.number().int().min(0),
      })
    ),
  });

  const { data: supplierData } = useSupplierList({
    limit: 1000,
    sortBy: 'created_at',
    order: 'asc',
  });
  const suppliers: Supplier[] = supplierData?.data?.map(toSupplier) ?? [];

  return {
    state,
    dispatch,
    form,
    suppliers,
  };
};
