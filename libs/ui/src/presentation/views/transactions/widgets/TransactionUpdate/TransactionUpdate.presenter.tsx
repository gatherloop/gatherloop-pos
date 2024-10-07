import { useFormik } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import { useState } from 'react';
import {
  TransactionUpdateView,
  TransactionUpdateViewProps,
} from './TransactionUpdate.view';
import { useTransactionUpdateController } from '../../../../controllers';
import { TransactionForm } from '../../../../../domain';
import { match, P } from 'ts-pattern';
import { z } from 'zod';

export const TransactionUpdate = () => {
  const [isProductSheetOpen, setIsProductSheetOpen] = useState<boolean>(false);

  const { state, dispatch } = useTransactionUpdateController();

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

  // const onAddItem = (newProduct: Product) => {
  //   const itemIndex = formik.values.transactionItems?.findIndex(
  //     ({ product }) => product.id === newProduct.id
  //   );
  //   const isItemExist = itemIndex !== -1;
  //   const newTransactionItems = isItemExist
  //     ? formik.values.transactionItems.map((transactionItem, index) =>
  //         index === itemIndex
  //           ? {
  //               ...transactionItem,
  //               amount: transactionItem.amount + 1,
  //             }
  //           : transactionItem
  //       )
  //     : [
  //         ...formik.values.transactionItems,
  //         { productId: newProduct.id, amount: 1, product: newProduct },
  //       ];

  //   formik.setFieldValue('transactionItems', newTransactionItems);
  //   setIsProductSheetOpen(false);
  // };

  const onRetryButtonPress = () => dispatch({ type: 'FETCH' });

  const isSubmitDisabled = state.type === 'submitting';

  const variant = match(state)
    .returnType<TransactionUpdateViewProps['variant']>()
    .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
    .with({ type: P.union('loaded', 'submitting', 'submitSuccess') }, () => ({
      type: 'loaded',
    }))
    .with({ type: 'error' }, () => ({ type: 'error' }))
    .exhaustive();

  return (
    <TransactionUpdateView
      formik={formik}
      isProductSheetOpen={isProductSheetOpen}
      isSubmitDisabled={isSubmitDisabled}
      total={total}
      onProductSheetOpenChange={setIsProductSheetOpen}
      onRetryButtonPress={onRetryButtonPress}
      variant={variant}
    />
  );
};
