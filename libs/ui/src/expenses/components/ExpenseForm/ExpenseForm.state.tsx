import { useToastController } from '@tamagui/toast';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  ExpenseRequest,
  expenseRequestSchema,
  useBudgetList,
  useExpenseCreate,
  useExpenseFindById,
  useExpenseUpdateById,
  useWalletList,
} from '../../../../../api-contract/src';
import { useFormik } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';

export type UseExpenseFormStateProps = {
  variant: { type: 'create' } | { type: 'update'; expenseId: number };
  onSuccess: () => void;
};

export const useExpenseFormState = ({
  variant,
  onSuccess,
}: UseExpenseFormStateProps) => {
  const wallets = useWalletList();
  const budgets = useBudgetList();

  const expenseId = variant.type === 'update' ? variant.expenseId : -1;

  const expense = useExpenseFindById(expenseId, {
    query: { enabled: variant.type === 'update' },
  });

  const createExpenseMutation = useExpenseCreate();
  const updateExpenseMutation = useExpenseUpdateById(expenseId);
  const mutation =
    variant.type === 'create' ? createExpenseMutation : updateExpenseMutation;

  const toast = useToastController();

  const formik = useFormik<ExpenseRequest>({
    initialValues: {
      budgetId: expense.data?.data.budgetId ?? NaN,
      walletId: expense.data?.data.walletId ?? NaN,
      expenseItems:
        expense.data?.data.expenseItems.map((item) => ({
          ...item,
          expenseId: undefined,
          id: undefined,
          subtotal: undefined,
        })) ?? [],
    },
    enableReinitialize: true,
    onSubmit: (values) =>
      mutation
        .mutateAsync(values)
        .then(() => {
          const message =
            variant.type === 'create'
              ? 'Expense created successfuly'
              : 'Expense updated successfully';
          toast.show(message);
        })
        .then(onSuccess)
        .catch(() => {
          const message =
            variant.type === 'create'
              ? 'Failed to create expense'
              : 'Failed to update expense';
          toast.show(message);
        }),

    validationSchema: toFormikValidationSchema(expenseRequestSchema),
  });

  const isSubmitDisabled =
    mutation.status === 'pending' || mutation.status === 'success';

  return {
    formik,
    wallets: wallets.data?.data ?? [],
    budgets: budgets.data?.data ?? [],
    isSubmitDisabled,
  };
};
