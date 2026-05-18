import { useEffect } from 'react';
import { MaterialUpdateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const suppliersSchema = z.array(
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
);

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
        suppliers: suppliersSchema,
      })
    ),
  });

  useEffect(() => {
    if (state.type === 'loaded') {
      form.reset(state.values);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.type]);

  return {
    state,
    dispatch,
    form,
  };
};
