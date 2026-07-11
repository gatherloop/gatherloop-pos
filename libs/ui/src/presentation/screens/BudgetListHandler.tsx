import { useRouter } from 'solito/router';
import {
  AuthLogoutUsecase,
  BudgetListUsecase,
} from '../../domain';
import { BudgetListScreen, BudgetListScreenProps } from './BudgetListScreen';
import { BudgetListItemProps } from '../components';
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
  const router = useRouter();
  return (
    <BudgetListScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      onEditMenuPress={(budget: BudgetListItemProps) =>
        router.push(`/budgets/${budget.id}`)
      }
      onItemPress={(budget: BudgetListItemProps) =>
        router.push(`/budgets/${budget.id}`)
      }
      onEmptyActionPress={() => router.push('/budgets/create')}
      onRetryButtonPress={() => budgetList.dispatch({ type: 'FETCH' })}
      isRevalidating={budgetList.state.type === 'revalidating'}
      variant={match(budgetList.state)
        .returnType<BudgetListScreenProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
        .with({ type: P.union('loaded', 'revalidating') }, ({ budgets }) => ({
          type: budgets.length > 0 ? 'loaded' : 'empty',
          items: budgets.map((budget) => ({
            name: budget.name,
            id: budget.id,
            percentage: budget.percentage,
          })),
        }))
        .with({ type: 'error' }, () => ({ type: 'error' }))
        .exhaustive()}
    />
  );
};
