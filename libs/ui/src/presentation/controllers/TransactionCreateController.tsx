import { useEffect, useState } from 'react';
import {
  Product,
  TransactionCreateUsecase,
  TransactionForm,
} from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';
import { UseFieldArrayReturn, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

export const useTransactionCreateController = (
  usecase: TransactionCreateUsecase
) => {
  const { state, dispatch } = useController(usecase);

  const [isProductSheetOpen, setIsProductSheetOpen] = useState<boolean>(false);

  const onProductSheetOpenChange = setIsProductSheetOpen;

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess')
      toast.show('Create Transaction Success');
    else if (state.type === 'submitError')
      toast.show('Create Transaction Error');
  }, [toast, state.type]);

  const form = useForm({
    defaultValues: state.values,
    resolver: zodResolver(
      z.object({
        name: z.string().min(1),
        transactionItems: z
          .array(
            z.lazy(() =>
              z.object({
                amount: z.number().min(1),
                discountAmount: z.number(),
              })
            )
          )
          .min(1),
      }),
      {},
      { raw: true }
    ),
  });

  const onSubmit = (values: TransactionForm) =>
    dispatch({ type: 'SUBMIT', values });

  const onAddItem = (
    newProduct: Product,
    fieldArray: UseFieldArrayReturn<TransactionForm, 'transactionItems', 'key'>
  ) => {
    const itemIndex = fieldArray.fields.findIndex(
      ({ product }) => newProduct.id === product.id
    );
    const isItemExist = itemIndex !== -1;
    if (isItemExist) {
      fieldArray.update(itemIndex, {
        ...form.getValues('transactionItems')[itemIndex],
        amount: form.getValues('transactionItems')[itemIndex].amount + 1,
      });
    } else {
      fieldArray.append({ amount: 1, product: newProduct, discountAmount: 0 });
    }

    setIsProductSheetOpen(false);
  };

  const isSubmitDisabled = state.type === 'submitting';

  return {
    isProductSheetOpen,
    onProductSheetOpenChange,
    state,
    dispatch,
    form,
    onSubmit,
    onAddItem,
    isSubmitDisabled,
  };
};
