import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, ExpenseCreateUsecase } from '../../../domain';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { useController } from '../../controllers/controller';
import { useAuthLogoutController } from '../../controllers';
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
  const expenseCreate = useController(expenseCreateUsecase);
  const router = useRouter();
  const toast = useToastController();

  useEffect(() => {
    if (expenseCreate.state.type === 'submitSuccess') {
      toast.show('Create Expense Success');
      router.push('/expenses');
    } else if (expenseCreate.state.type === 'submitError') {
      toast.show('Create Expense Error');
    }
  }, [expenseCreate.state.type, router, toast]);

  return (
    <ExpenseCreateScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      defaultValues={expenseCreate.state.values}
      isSubmitDisabled={
        expenseCreate.state.type === 'submitting' ||
        expenseCreate.state.type === 'submitSuccess'
      }
      isSubmitting={expenseCreate.state.type === 'submitting'}
      serverError={
        expenseCreate.state.type === 'submitError'
          ? 'Failed to submit. Please try again.'
          : undefined
      }
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
        .with({ type: 'error' }, () => ({
          type: 'error',
          onRetryButtonPress: () => expenseCreate.dispatch({ type: 'FETCH' }),
        }))
        .exhaustive()}
    />
  );
};
