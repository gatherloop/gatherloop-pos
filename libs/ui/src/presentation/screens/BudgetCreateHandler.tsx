import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import {
  useBudgetCreateController,
  useAuthLogoutController,
} from '../controllers';
import { AuthLogoutUsecase, BudgetCreateUsecase } from '../../domain';
import { BudgetCreateScreen } from './BudgetCreateScreen';

export type BudgetCreateHandlerProps = {
  budgetCreateUsecase: BudgetCreateUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const BudgetCreateHandler = ({
  budgetCreateUsecase,
  authLogoutUsecase,
}: BudgetCreateHandlerProps) => {
  const router = useRouter();
  const budgetCreate = useBudgetCreateController(budgetCreateUsecase);
  const authLogout = useAuthLogoutController(authLogoutUsecase);

  useEffect(() => {
    if (budgetCreate.state.type === 'submitSuccess') router.push('/budgets');
  }, [budgetCreate.state.type, router]);

  return (
    <BudgetCreateScreen
      form={budgetCreate.form}
      onSubmit={(values) =>
        budgetCreate.dispatch({ type: 'SUBMIT', values })
      }
      isSubmitDisabled={
        budgetCreate.state.type === 'submitting' ||
        budgetCreate.state.type === 'submitSuccess'
      }
      isSubmitting={budgetCreate.state.type === 'submitting'}
      serverError={
        budgetCreate.state.type === 'submitError'
          ? 'Failed to submit. Please try again.'
          : undefined
      }
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
    />
  );
};
