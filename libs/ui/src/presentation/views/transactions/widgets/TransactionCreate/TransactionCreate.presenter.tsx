import { useFormik } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import { useEffect, useState } from 'react';
import { TransactionCreateView } from './TransactionCreate.view';
import { useTransactionCreateController } from '../../../../controllers';
import { Product, TransactionForm } from '../../../../../domain';
import { z } from 'zod';
import { useToastController } from '@tamagui/toast';

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

  const formik = useFormik<TransactionForm>({
    initialValues: state.values,
    enableReinitialize: true,
    onSubmit: (values) => dispatch({ type: 'SUBMIT', values }),
    validationSchema: toFormikValidationSchema(
      z.object({
        name: z.string(),
        transactionItems: z.array(
          z.lazy(() => z.object({ amount: z.number() }))
        ),
      })
    ),
  });

  const total = formik.values.transactionItems.reduce(
    (prev, curr) => prev + curr.amount * curr.product.price,
    0
  );

  const onAddItem = (newProduct: Product) => {
    const itemIndex = formik.values.transactionItems?.findIndex(
      ({ product }) => newProduct.id === product.id
    );
    const isItemExist = itemIndex !== -1;
    const newTransactionItems = isItemExist
      ? formik.values.transactionItems.map((transactionItem, index) =>
          index === itemIndex
            ? {
                ...transactionItem,
                amount: transactionItem.amount + 1,
              }
            : transactionItem
        )
      : [
          ...formik.values.transactionItems,
          { productId: newProduct.id, amount: 1, product: newProduct },
        ];

    formik.setFieldValue('transactionItems', newTransactionItems);
    setIsProductSheetOpen(false);
  };

  const isSubmitDisabled = state.type === 'submitting';

  return (
    <TransactionCreateView
      isProductSheetOpen={isProductSheetOpen}
      onProductSheetOpenChange={setIsProductSheetOpen}
      formik={formik}
      isSubmitDisabled={isSubmitDisabled}
      total={total}
      onAddItem={onAddItem}
    />
  );
};
