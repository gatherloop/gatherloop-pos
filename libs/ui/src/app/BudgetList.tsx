import { ApiAuthRepository, ApiBudgetRepository } from '../data';
import {
  AuthLogoutUsecase,
  BudgetListParams,
  BudgetListUsecase,
} from '../domain';
import { BudgetListHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type BudgetListProps = {
  budgetListParams: BudgetListParams;
};

export function BudgetList({ budgetListParams }: BudgetListProps) {
  const client = new QueryClient();
  const authRepository = new ApiAuthRepository();
  const budgetRepository = new ApiBudgetRepository(client);

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const budgetListUsecase = new BudgetListUsecase(
    budgetRepository,
    budgetListParams
  );

  return (
    <BudgetListHandler
      authLogoutUsecase={authLogoutUsecase}
      budgetListUsecase={budgetListUsecase}
    />
  );
}
