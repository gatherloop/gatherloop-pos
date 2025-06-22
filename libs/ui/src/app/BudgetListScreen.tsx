import { ApiAuthRepository, ApiBudgetRepository } from '../data';
import {
  AuthLogoutUsecase,
  BudgetListParams,
  BudgetListUsecase,
} from '../domain';
import { BudgetListScreen as BudgetListScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type BudgetListScreenProps = {
  budgetListParams: BudgetListParams;
};

export function BudgetListScreen({ budgetListParams }: BudgetListScreenProps) {
  const client = new QueryClient();

  const authRepository = new ApiAuthRepository();
  const budgetRepository = new ApiBudgetRepository(client);

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const budgetListUsecase = new BudgetListUsecase(
    budgetRepository,
    budgetListParams
  );

  return (
    <BudgetListScreenView
      budgetListUsecase={budgetListUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
