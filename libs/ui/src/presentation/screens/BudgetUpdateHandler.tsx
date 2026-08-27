import { useRouter } from 'solito/router';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import {
  useBudgetUpdateController,
  useAuthLogoutController,
} from '../controllers';
import { AuthLogoutUsecase, BudgetUpdateUsecase } from '../../domain';
import {
  BudgetUpdateScreen,
  BudgetUpdateScreenProps,
} from './BudgetUpdateScreen';

export type BudgetUpdateHandlerProps = {
  budgetUpdateUsecase: BudgetUpdateUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const BudgetUpdateHandler = ({
  budgetUpdateUsecase,
  authLogoutUsecase,
}: BudgetUpdateHandlerProps) => {
  const router = useRouter();
  const budgetUpdate = useBudgetUpdateController(budgetUpdateUsecase);
  const authLogout = useAuthLogoutController(authLogoutUsecase);

  useEffect(() => {
    if (budgetUpdate.state.type === 'submitSuccess') router.push('/budgets');
  }, [budgetUpdate.state.type, router]);

  return (
    <BudgetUpdateScreen
      defaultValues={budgetUpdate.state.values}
      onSubmit={(values) =>
        budgetUpdate.dispatch({ type: 'SUBMIT', values })
      }
      isSubmitDisabled={
        budgetUpdate.state.type === 'submitting' ||
        budgetUpdate.state.type === 'submitSuccess'
      }
      isSubmitting={budgetUpdate.state.type === 'submitting'}
      serverError={
        budgetUpdate.state.type === 'submitError'
          ? 'Failed to submit. Please try again.'
          : undefined
      }
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      variant={match(budgetUpdate.state)
        .returnType<BudgetUpdateScreenProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({
          type: 'loading',
        }))
        .with(
          {
            type: P.union(
              'loaded',
              'submitError',
              'submitSuccess',
              'submitting'
            ),
          },
          () => ({
            type: 'loaded',
          })
        )
        .with({ type: 'error' }, () => ({
          type: 'error',
          onRetryButtonPress: () => budgetUpdate.dispatch({ type: 'FETCH' }),
        }))
        .exhaustive()}
    />
  );
};
