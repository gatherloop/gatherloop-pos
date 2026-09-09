import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, ExpenseUpdateUsecase } from '../../../domain';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { useUsecase, useAuthLogout } from '../hooks';
import {
  ExpenseUpdateScreen,
  ExpenseUpdateScreenProps,
} from '../../views/screens/pos/ExpenseUpdateScreen';

export type ExpenseUpdateHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  expenseUpdateUsecase: ExpenseUpdateUsecase;
};

export const ExpenseUpdateHandler = ({
  authLogoutUsecase,
  expenseUpdateUsecase,
}: ExpenseUpdateHandlerProps) => {
  const authLogout = useAuthLogout(authLogoutUsecase);
  const expenseUpdate = useUsecase(expenseUpdateUsecase);
  const router = useRouter();
  const toast = useToastController();

  useEffect(() => {
    if (expenseUpdate.state.type === 'submitSuccess') {
      toast.show('Update Expense Success');
      router.push('/expenses');
    } else if (expenseUpdate.state.type === 'submitError') {
      toast.show('Update Expense Error');
    }
  }, [expenseUpdate.state.type, router, toast]);

  return (
    <ExpenseUpdateScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      defaultValues={expenseUpdate.state.values}
      isSubmitDisabled={
        expenseUpdate.state.type === 'submitting' ||
        expenseUpdate.state.type === 'submitSuccess'
      }
      isSubmitting={expenseUpdate.state.type === 'submitting'}
      serverError={
        expenseUpdate.state.type === 'submitError'
          ? 'Failed to submit. Please try again.'
          : undefined
      }
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
        .with({ type: 'error' }, () => ({
          type: 'error',
          onRetryButtonPress: () => expenseUpdate.dispatch({ type: 'FETCH' }),
        }))
        .exhaustive()}
    />
  );
};
