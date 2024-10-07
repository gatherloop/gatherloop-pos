import { useFormik } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import {
  ExpenseCreateView,
  ExpenseCreateViewProps,
} from './ExpenseCreate.view';
import { ExpenseForm } from '../../../../../domain';
import { useExpenseCreateController } from '../../../../controllers';
import { match, P } from 'ts-pattern';
import { z } from 'zod';

export const ExpenseCreate = () => {
  const { state, dispatch } = useExpenseCreateController();

  const formik = useFormik<ExpenseForm>({
    initialValues: state.values,
    enableReinitialize: true,
    onSubmit: (values) => dispatch({ type: 'SUBMIT', values }),
    validationSchema: toFormikValidationSchema(
      z.object({
        walletId: z.number(),
        budgetId: z.number(),
        expenseItems: z.array(
          z.lazy(() =>
            z.object({
              name: z.string(),
              unit: z.string(),
              price: z.number(),
              amount: z.number(),
            })
          )
        ),
      })
    ),
  });

  const isSubmitDisabled =
    state.type === 'submitting' || state.type === 'submitSuccess';

  const onRetryButtonPress = () => dispatch({ type: 'FETCH' });

  const budgetSelectOptions = state.budgets.map((budget) => ({
    label: budget.name,
    value: budget.id,
  }));

  const walletSelectOptions = state.wallets.map((wallet) => ({
    label: wallet.name,
    value: wallet.id,
  }));

  const variant = match(state)
    .returnType<ExpenseCreateViewProps['variant']>()
    .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
    .with({ type: P.union('loaded', 'submitting', 'submitSuccess') }, () => ({
      type: 'loaded',
    }))
    .with({ type: 'error' }, () => ({ type: 'error' }))
    .exhaustive();

  return (
    <ExpenseCreateView
      isSubmitDisabled={isSubmitDisabled}
      onRetryButtonPress={onRetryButtonPress}
      budgetSelectOptions={budgetSelectOptions}
      walletSelectOptions={walletSelectOptions}
      formik={formik}
      variant={variant}
    />
  );
};
