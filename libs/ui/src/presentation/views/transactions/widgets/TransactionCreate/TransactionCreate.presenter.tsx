import { useEffect, useState } from 'react';
import { TransactionCreateView } from './TransactionCreate.view';
import { useTransactionCreateController } from '../../../../controllers';
import { Product, TransactionForm } from '../../../../../domain';
import { z } from 'zod';
import { useToastController } from '@tamagui/toast';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

export const TransactionCreate = () => {
  const [isProductSheetOpen, setIsProductSheetOpen] = useState<boolean>(false);

  const { state, dispatch } = useTransactionCreateController();

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
          .array(z.lazy(() => z.object({ amount: z.number().min(1) })))
          .min(1),
      }),
      {},
      { raw: true }
    ),
  });

  const onSubmit = (values: TransactionForm) =>
    dispatch({ type: 'SUBMIT', values });

  const { append, update, fields } = useFieldArray({
    control: form.control,
    name: 'transactionItems',
  });

  const onAddItem = (newProduct: Product) => {
    const itemIndex = fields.findIndex(
      ({ product }) => newProduct.id === product.id
    );
    const isItemExist = itemIndex !== -1;
    if (isItemExist) {
      update(itemIndex, {
        ...fields[itemIndex],
        amount: fields[itemIndex].amount + 1,
      });
    } else {
      append({ amount: 1, product: newProduct });
    }

    setIsProductSheetOpen(false);
  };

  const isSubmitDisabled = state.type === 'submitting';

  return (
    <TransactionCreateView
      isProductSheetOpen={isProductSheetOpen}
      onProductSheetOpenChange={setIsProductSheetOpen}
      form={form}
      onSubmit={onSubmit}
      isSubmitDisabled={isSubmitDisabled}
      onAddItem={onAddItem}
    />
  );
};
