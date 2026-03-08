import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, ExpenseCreateUsecase } from '../../domain';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useExpenseCreateController,
} from '../controllers';
import {
  ExpenseCreateScreen,
  ExpenseCreateScreenProps,
} from './ExpenseCreateScreen';

export type ExpenseCreateHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  expenseCreateUsecase: ExpenseCreateUsecase;
};

export const ExpenseCreateHandler = ({
  authLogoutUsecase,
  expenseCreateUsecase,
}: ExpenseCreateHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const expenseCreate = useExpenseCreateController(expenseCreateUsecase);
  const router = useRouter();

  useEffect(() => {
    if (expenseCreate.state.type === 'submitSuccess')
      router.push('/expenses');
  }, [expenseCreate.state.type, router]);

  return (
    <ExpenseCreateScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      form={expenseCreate.form}
      isSubmitDisabled={
        expenseCreate.state.type === 'submitting' ||
        expenseCreate.state.type === 'submitSuccess'
      }
      onRetryButtonPress={() => expenseCreate.dispatch({ type: 'FETCH' })}
      onSubmit={(values) =>
        expenseCreate.dispatch({ type: 'SUBMIT', values })
      }
      budgetSelectOptions={expenseCreate.state.budgets.map((budget) => ({
        label: budget.name,
        value: budget.id,
      }))}
      walletSelectOptions={expenseCreate.state.wallets.map((wallet) => ({
        label: wallet.name,
        value: wallet.id,
      }))}
      variant={match(expenseCreate.state)
        .returnType<ExpenseCreateScreenProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
        .with(
          {
            type: P.union('loaded', 'submitting', 'submitSuccess', 'submitError'),
          },
          () => ({
            type: 'loaded',
          })
        )
        .with({ type: 'error' }, () => ({ type: 'error' }))
        .exhaustive()}
    />
  );
};
