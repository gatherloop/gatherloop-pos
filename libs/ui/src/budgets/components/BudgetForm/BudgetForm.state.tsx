// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  BudgetRequest,
  budgetRequestSchema,
  useBudgetCreate,
  useBudgetFindById,
  useBudgetUpdateById,
} from '../../../../../api-contract/src';
import { useFormik } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';

export type UseBudgetFormStateProps = {
  variant: { type: 'create' } | { type: 'update'; budgetId: number };
  onSuccess: () => void;
};

export const useBudgetFormState = ({
  variant,
  onSuccess,
}: UseBudgetFormStateProps) => {
  const budgetId = variant.type === 'update' ? variant.budgetId : -1;

  const budget = useBudgetFindById(budgetId, {
    query: { enabled: variant.type === 'update' },
  });

  const createBudgetMutation = useBudgetCreate();
  const updateBudgetMutation = useBudgetUpdateById(budgetId);
  const mutation =
    variant.type === 'create' ? createBudgetMutation : updateBudgetMutation;

  const formik = useFormik<BudgetRequest>({
    initialValues: {
      name: budget.data?.data.name ?? '',
      balance: budget.data?.data.balance ?? 0,
      percentage: budget.data?.data.percentage ?? 0,
    },
    enableReinitialize: true,
    onSubmit: (values) => mutation.mutateAsync(values).then(onSuccess),
    validationSchema: toFormikValidationSchema(budgetRequestSchema),
  });

  return { formik };
};
