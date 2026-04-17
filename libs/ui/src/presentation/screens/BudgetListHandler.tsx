import { AuthLogoutUsecase, BudgetListUsecase } from '../../domain';
import { BudgetListScreen, BudgetListScreenProps } from './BudgetListScreen';
import { match, P } from 'ts-pattern';
import {
  useAuthLogoutController,
  useBudgetListController,
} from '../controllers';

export type BudgetListHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  budgetListUsecase: BudgetListUsecase;
};

export const BudgetListHandler = ({
  authLogoutUsecase,
  budgetListUsecase,
}: BudgetListHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const budgetList = useBudgetListController(budgetListUsecase);
  return (
    <BudgetListScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      onRetryButtonPress={() => budgetList.dispatch({ type: 'FETCH' })}
      isRevalidating={budgetList.state.type === 'revalidating'}
      variant={match(budgetList.state)
        .returnType<BudgetListScreenProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
        .with({ type: P.union('loaded', 'revalidating') }, ({ budgets }) => ({
          type: budgets.length > 0 ? 'loaded' : 'empty',
          items: budgets.map((budget) => ({
            name: budget.name,
            balance: budget.balance,
            id: budget.id,
            percentage: budget.percentage,
          })),
        }))
        .with({ type: 'error' }, () => ({ type: 'error' }))
        .exhaustive()}
    />
  );
};
