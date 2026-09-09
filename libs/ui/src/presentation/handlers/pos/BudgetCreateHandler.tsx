import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { useController } from '../../controllers/controller';
import { useAuthLogoutController } from '../../controllers';
import { AuthLogoutUsecase, BudgetCreateUsecase } from '../../../domain';
import { BudgetCreateScreen } from '../../screens/pos/BudgetCreateScreen';

export type BudgetCreateHandlerProps = {
  budgetCreateUsecase: BudgetCreateUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const BudgetCreateHandler = ({
  budgetCreateUsecase,
  authLogoutUsecase,
}: BudgetCreateHandlerProps) => {
  const router = useRouter();
  const budgetCreate = useController(budgetCreateUsecase);
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const toast = useToastController();

  useEffect(() => {
    if (budgetCreate.state.type === 'submitSuccess') {
      toast.show('Create Budget Success');
      router.push('/budgets');
    } else if (budgetCreate.state.type === 'submitError') {
      toast.show('Create Budget Error');
    }
  }, [budgetCreate.state.type, toast, router]);

  return (
    <BudgetCreateScreen
      defaultValues={budgetCreate.state.values}
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
