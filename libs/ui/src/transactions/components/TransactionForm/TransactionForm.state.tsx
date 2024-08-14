import { useToastController } from '@tamagui/toast';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  Product,
  TransactionItemRequest,
  TransactionRequest,
  transactionRequestSchema,
  useTransactionCreate,
  useTransactionFindById,
  useTransactionUpdateById,
} from '../../../../../api-contract/src';
import { useFormik } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import { useState } from 'react';

export type TransactionFormValues = Omit<
  TransactionRequest,
  'transactionItems'
> & {
  transactionItems: (TransactionItemRequest & { product: Product })[];
};

export type UseTransactionFormStateProps = {
  variant: { type: 'create' } | { type: 'update'; transactionId: number };
  onSuccess: () => void;
};

export const useTransactionFormState = ({
  variant,
  onSuccess,
}: UseTransactionFormStateProps) => {
  const [isProductSheetOpen, setIsProductSheetOpen] = useState<boolean>(false);

  const transactionId = variant.type === 'update' ? variant.transactionId : -1;

  const transaction = useTransactionFindById(transactionId, {
    query: { enabled: variant.type === 'update' },
  });

  const createTransactionMutation = useTransactionCreate();
  const updateTransactionMutation = useTransactionUpdateById(transactionId);
  const mutation =
    variant.type === 'create'
      ? createTransactionMutation
      : updateTransactionMutation;

  const toast = useToastController();

  const formik = useFormik<TransactionFormValues>({
    initialValues: {
      name: transaction.data?.data.name ?? '',
      transactionItems:
        transaction.data?.data.transactionItems.map((item) => ({
          ...item,
          id: undefined,
          price: undefined,
          subtotal: undefined,
          transactionId: undefined,
        })) ?? [],
    },
    enableReinitialize: true,
    onSubmit: (values) =>
      mutation
        .mutateAsync({
          ...values,
          transactionItems: values.transactionItems.map((item) => ({
            ...item,
            product: undefined,
          })),
        })
        .then(() => {
          const message =
            variant.type === 'create'
              ? 'Transaction created successfuly'
              : 'Transaction updated successfully';
          toast.show(message);
        })
        .then(onSuccess)
        .catch(() => {
          const message =
            variant.type === 'create'
              ? 'Failed to create transaction'
              : 'Failed to update transaction';
          toast.show(message);
        }),
    validationSchema: toFormikValidationSchema(transactionRequestSchema),
  });

  const total = formik.values.transactionItems.reduce(
    (prev, curr) => prev + curr.amount * curr.product.price,
    0
  );

  const onAddItem = (product: Product) => {
    const itemIndex = formik.values.transactionItems?.findIndex(
      ({ productId }) => productId === product.id
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
          { productId: product.id, amount: 1, product },
        ];

    formik.setFieldValue('transactionItems', newTransactionItems);
    setIsProductSheetOpen(false);
  };

  const isFormDisabled = transaction.data?.data.paidAt !== undefined;

  const isSubmitDisabled =
    mutation.status === 'pending' || mutation.status === 'success';

  return {
    formik,
    total,
    isProductSheetOpen,
    setIsProductSheetOpen,
    onAddItem,
    isFormDisabled,
    isSubmitDisabled,
  };
};
