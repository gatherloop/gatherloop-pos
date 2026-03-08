import { useToastController } from '@tamagui/toast';
import { CalculationUpdateUsecase } from '../../domain';
import { useController } from './controller';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

export const useCalculationUpdateController = (
  usecase: CalculationUpdateUsecase
) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess')
      toast.show('Update Calculation Success');
    else if (state.type === 'submitError')
      toast.show('Update Calculation Error');
  }, [toast, state.type]);

  const form = useForm({
    defaultValues: state.values,
    resolver: zodResolver(
      z.object({
        walletId: z.number(),
        calculationItems: z
          .array(
            z.lazy(() =>
              z.object({
                price: z.number().min(1),
                amount: z.number().min(0),
              })
            )
          )
          .min(1),
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
