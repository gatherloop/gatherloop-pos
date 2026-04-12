import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, ExpenseUpdateUsecase } from '../../domain';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useExpenseUpdateController,
} from '../controllers';
import {
  ExpenseUpdateScreen,
  ExpenseUpdateScreenProps,
} from './ExpenseUpdateScreen';

export type ExpenseUpdateHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  expenseUpdateUsecase: ExpenseUpdateUsecase;
};

export const ExpenseUpdateHandler = ({
  authLogoutUsecase,
  expenseUpdateUsecase,
}: ExpenseUpdateHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const expenseUpdate = useExpenseUpdateController(expenseUpdateUsecase);
  const router = useRouter();

  useEffect(() => {
    if (expenseUpdate.state.type === 'submitSuccess')
      router.push('/expenses');
  }, [expenseUpdate.state.type, router]);

  return (
    <ExpenseUpdateScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      form={expenseUpdate.form}
      isSubmitDisabled={
        expenseUpdate.state.type === 'submitting' ||
        expenseUpdate.state.type === 'submitSuccess'
      }
      isSubmitting={expenseUpdate.state.type === 'submitting'}
      onRetryButtonPress={() => expenseUpdate.dispatch({ type: 'FETCH' })}
      onSubmit={(values) =>
        expenseUpdate.dispatch({ type: 'SUBMIT', values })
      }
      budgetSelectOptions={expenseUpdate.state.budgets.map((budget) => ({
        label: budget.name,
        value: budget.id,
      }))}
      walletSelectOptions={expenseUpdate.state.wallets.map((wallet) => ({
        label: wallet.name,
        value: wallet.id,
      }))}
      variant={match(expenseUpdate.state)
        .returnType<ExpenseUpdateScreenProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
        .with(
          {
            type: P.union(
              'loaded',
              'submitting',
              'submitSuccess',
              'submitError'
            ),
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
