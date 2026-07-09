import { useEffect } from 'react';
import { MaterialCreateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

export const useMaterialCreateController = (usecase: MaterialCreateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Create Material Success');
    else if (state.type === 'submitError') toast.show('Create Material Error');
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
        isStockCheckRequired: z.boolean(),
        suppliers: z.array(
          z
            .object({
              supplierId: z.number().min(1, 'Supplier is required'),
              purchaseType: z.enum(['online', 'offline', 'delivery']),
              purchaseUrl: z.string(),
            })
            .superRefine((val, ctx) => {
              if (val.purchaseType === 'online') {
                if (!val.purchaseUrl) {
                  ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Purchase URL is required for online purchase type',
                    path: ['purchaseUrl'],
                  });
                } else if (!/^https?:\/\/.+/.test(val.purchaseUrl)) {
                  ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Purchase URL must start with http:// or https://',
                    path: ['purchaseUrl'],
                  });
                }
              } else if (val.purchaseUrl) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: 'Purchase URL must be empty for non-online purchase type',
                  path: ['purchaseUrl'],
                });
              }
            })
        ),
      })
    ),
  });

  return {
    state,
    dispatch,
    form,
  };
};
